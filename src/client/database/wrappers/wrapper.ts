import _debug from 'debug';
import type { GetBatchResult } from '@prisma/client/runtime/library';
import { UnitConstants } from '@client/constants';
import { Model } from '../models';
import { PopulatedPrisma } from '../populated';
import type {
  ModelFindManyArgs,
  ModelFindUniqueArgs,
  ModelGetPayload,
  ModelUpdateArgs,
  ThenArg,
} from '../types';
import { CacheManager, PerformanceTracker } from '@client/data-structures';

// [DEV] IDs for debugging
// [DEV] !this.useCache || !cacheResult does NOT make sense
// [DEV] The result of the operation.

const debug = _debug('app:database:wrapper');

const defaultCache = CacheManager.fromStore<ThenArg<ModelGetPayload[Model]>>({
  max: 500,
  ttl: UnitConstants.MS_IN_ONE_HOUR,
  updateAgeOnGet: true,
  updateAgeOnHas: false,
});

const modelOperations = [
  'aggregate',
  'count',
  'clearCache',
  'create',
  'createMany',
  'createManyAndReturn',
  'delete',
  'deleteMany',
  'deleteManyAndReturn',
  'findById',
  'findFirst',
  'findFirstOrThrow',
  'findManyById',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'groupBy',
  'updateById',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
] as const;

type ModelOperation = (typeof modelOperations)[number];
type CacheType<T extends Model> = ThenArg<ModelGetPayload[T]>;
type CacheManagerType<T extends Model> = CacheManager<CacheType<T>>;

type DatabaseWrapperOptions<T extends Model> = {
  /**
   * The cache manager to use for this wrapper.
   *
   * Please note that a single cache manager is used by default,
   * which is shared across all instances of `DatabaseWrapper`.
   * This means the `max` and `ttl` values apply to the entire
   * database cache and not just a single model. The benefit of
   * that is that you can easily control the (max) cache size of
   * the entire database caching layer.
   */
  readonly cache?: CacheManagerType<T>;
  /**
   * Whether to use the cache for operations.
   *
   * If set to `false`, the cache will be ignored for all operations,
   * regardless of the operation or cache manager used.
   */
  readonly useCache?: boolean;
  /**
   * The prefix to use for cache keys.
   */
  readonly cachePrefix?: string;
  /**
   * A function to run before each operation starts.
   */
  readonly beforeEach?: () => Promise<void>;
  /**
   * A function to run after each operation finishes.
   */
  readonly afterEach?: () => Promise<void>;
};

class DatabaseWrapper<T extends Model> implements DatabaseWrapperOptions<T> {
  protected readonly debug = debug.extend(this.model);

  public readonly cache: CacheManagerType<T>;
  public readonly useCache: boolean;
  public readonly cachePrefix: string;
  public readonly beforeEach?: () => Promise<void>;
  public readonly afterEach?: () => Promise<void>;

  public readonly trackers = Object.fromEntries(
    modelOperations.map((operation) => [
      operation,
      new PerformanceTracker<unknown>(() => {}, {
        name: operation,
        onEnd: ({ name, duration, metrics }) => {
          this.debug(
            'Operation "%s" completed in %dms, metrics: %o',
            name,
            duration,
            metrics,
          );
        },
      }),
    ]),
  ) as Record<ModelOperation, PerformanceTracker<unknown>>;

  constructor(
    public readonly model: T,
    options?: Partial<DatabaseWrapperOptions<T>>,
  ) {
    this.cache =
      options?.cache ?? (defaultCache as unknown as CacheManagerType<T>);
    this.useCache = options?.useCache ?? true;
    this.cachePrefix = options?.cachePrefix ?? model;
    this.beforeEach = options?.beforeEach;
    this.afterEach = options?.afterEach;

    // Register cache events for debugging
    this.cache.on('set', ({ key, value, error }) => {
      if (!key.startsWith(this.cachePrefix)) {
        return;
      }

      if (error) {
        this.debug('Cache set event for key: %s failed: %o', key, error);
      } else {
        this.debug('Cache set event for key %s: %o', key, value);
      }
    });
    this.cache.on('del', ({ key, error }) => {
      if (!key.startsWith(this.cachePrefix)) {
        return;
      }

      if (error) {
        this.debug('Cache del event for key: %s failed: %o', key, error);
      } else {
        this.debug('Cache del event for key: %s', key);
      }
    });
    this.cache.on('refresh', ({ key, value, error }) => {
      if (!key.startsWith(this.cachePrefix)) {
        return;
      }

      if (error) {
        this.debug('Cache refresh event for key: %s failed: %o', key, error);
      } else {
        this.debug('Cache refresh event for key %s: %o', key, value);
      }
    });
  }

  private readonly withHooks = async <T>(
    name: ModelOperation,
    fn: () => T | Promise<T>,
  ) => {
    if (this.beforeEach) {
      await this.beforeEach();
    }

    const tracker = this.trackers[name];
    const result = await tracker.run(fn, name);

    if (this.afterEach) {
      await this.afterEach();
    }

    return result;
  };

  //
  // Caching
  //

  readonly clearCache = () => {
    if (!this.useCache) {
      this.debug('Cache is disabled, skipping cache clearing.');

      return Promise.resolve();
    }

    this.debug('Clearing cache for model');

    return this.withHooks('clearCache', () =>
      this.cache.clearByPrefix(this.cachePrefix),
    );
  };

  private readonly clearMutationCache = async () => {
    if (!this.useCache) {
      this.debug('Cache is disabled, skipping mutation cache clearing.');

      return;
    }

    this.debug('Clearing mutation cache for model');

    await Promise.all([
      this.cache.clearByPrefix(`${this.cachePrefix}:first:`),
      this.cache.clearByPrefix(`${this.cachePrefix}:many:`),
      this.cache.clearByPrefix(`${this.cachePrefix}:unique:`),
    ]);
  };

  private readonly withCache = async (
    cacheKey: string,
    data: CacheType<T> | (() => Promise<CacheType<T>>),
  ): Promise<CacheType<T>> => {
    const resolver = typeof data === 'function' ? data : () => data;

    if (!this.useCache) {
      this.debug('Cache is disabled, skipping cache operation.');

      return resolver();
    }

    const cachedData = await this.cache.get(cacheKey);

    if (cachedData) {
      this.debug('Cache hit for key: %s', cacheKey);

      return cachedData;
    } else {
      this.debug('Cache miss for key: %s', cacheKey);
    }

    const result = await resolver();

    if (result !== null) {
      this.debug('Setting cache for key: %s', cacheKey);

      await this.cache.set(cacheKey, result);
    } else {
      this.debug(
        'Skipping cache operation for key: %s, result is null',
        cacheKey,
      );
    }

    return result;
  };

  private readonly withNullableCache = async (
    cacheKey: string,
    data: null | CacheType<T> | (() => Promise<null | CacheType<T>>),
  ): Promise<CacheType<T> | null> => {
    const resolver = typeof data === 'function' ? data : () => data;

    if (!this.useCache) {
      this.debug('Cache is disabled, skipping nullable cache operation.');

      return resolver();
    }

    const cachedData = await this.cache.get(cacheKey);

    if (typeof cachedData !== 'undefined') {
      this.debug('Cache hit (nullable) for key: %s', cacheKey);

      return cachedData;
    } else {
      this.debug('Cache miss (nullable) for key: %s', cacheKey);
    }

    const result = await resolver();

    this.debug('Setting (nullable) cache for key: %s', cacheKey);
    await this.cache.set(cacheKey, result);

    return result;
  };

  public readonly buildCacheKey = (
    record: string | number | CacheType<T> | { id: string | number },
  ): string => {
    const id = typeof record === 'object' ? record.id : record;
    const cacheKey = `${this.cachePrefix}:${id.toString()}`;

    this.debug('Built cache key: %s', cacheKey);

    return cacheKey;
  };

  //
  // Other/Etc. (Operations)
  //

  /**
   * Aggregate data based on the query.
   * - This operation is not cached.
   * @param query The query to use for aggregation.
   * @returns The aggregated data.
   */
  readonly aggregate = async (
    query?: Parameters<typeof PopulatedPrisma.aggregate<T>>[1],
  ) => {
    this.debug('Aggregating data based on query: %o', query);

    return this.withHooks('aggregate', () =>
      PopulatedPrisma.aggregate(this.model, query),
    );
  };

  /**
   * Count the number of records based on the query.
   * - This operation is not cached.
   * @param query The query to use for counting.
   * @returns The amount of records.
   */
  readonly count = async (
    query?: Parameters<typeof PopulatedPrisma.count<T>>[1],
  ) => {
    this.debug('Counting records based on query: %o', query);

    return this.withHooks('count', () =>
      PopulatedPrisma.count(this.model, query),
    );
  };

  /**
   * A static reference to the fields of the model, because the fields
   * are not expected to change during runtime.
   * @returns The fields of the model.
   */
  readonly fields = PopulatedPrisma.fields(this.model);

  //
  // Create Operations
  //

  /**
   * Write a new record to the database.
   * - Creating a new record caches the result, if caching is enabled.
   * @param createData The data to create the record with.
   * @param cacheResult Whether to created record should be cached.
   * @returns The created record.
   */
  readonly create = async (
    createData: Parameters<typeof PopulatedPrisma.create<T>>[1],
    cacheResult = true,
  ) => {
    this.debug('Creating a new record with data: %o', createData);

    const fn = () =>
      PopulatedPrisma.create(this.model, createData).then((record) => {
        if (this.useCache) {
          void this.clearMutationCache();
        }

        return record;
      });

    return this.withHooks('create', async () => {
      if (!this.useCache || !cacheResult) {
        this.debug('Skipping cache for create operation');

        return fn();
      }

      const data = await fn();

      return this.withCache(this.buildCacheKey(data), data);
    });
  };

  /**
   * Write multiple new records to the database.
   * - The cache can not be used for this operation because a {@link GetBatchResult} is returned.
   *   If you want to cache the results, use {@link createManyAndReturn}.
   * @param query The query to use for creating the records.
   * @returns The result of the operation.
   */
  readonly createMany = async (
    query: Parameters<typeof PopulatedPrisma.createMany<T>>[1],
  ): Promise<ThenArg<GetBatchResult>> => {
    this.debug('Creating multiple new records with query: %o', query);

    return this.withHooks('createMany', () =>
      PopulatedPrisma.createMany(this.model, query),
    ).then(async (data) => {
      if (this.useCache) {
        void this.clearMutationCache();
      }

      return data;
    });
  };

  /**
   * Write multiple new records to the database and return them.
   * - Creating multiple new records caches the results, if caching is enabled.
   * @param query The query to use for creating the records.
   * @param cacheResult Whether the created record(s) should be cached.
   * @returns The created records.
   */
  readonly createManyAndReturn = async (
    query: Parameters<typeof PopulatedPrisma.createManyAndReturn<T>>[1],
    cacheResult = true,
  ) => {
    this.debug(
      'Creating multiple new records with query: %o and returning',
      query,
    );

    return this.withHooks('createManyAndReturn', async () => {
      const data = await PopulatedPrisma.createManyAndReturn(
        this.model,
        query,
      ).then((data) => {
        if (this.useCache) {
          void this.clearMutationCache();
        }

        return data;
      });

      if (data.length === 0 || !this.useCache || !cacheResult) {
        this.debug(
          'Skipping cache for createManyAndReturn operation, %o',
          data.length
            ? 'no records were created'
            : 'cache is disabled or not requested',
        );

        return data;
      }

      await Promise.all(
        data.map(async (record) =>
          this.withCache(this.buildCacheKey(record), record),
        ),
      );

      return data;
    });
  };

  //
  // Delete Operations
  //

  /**
   * Delete a record from the database.
   * - Deleting a record clears the cache for the record, if caching is enabled.
   * @param query The query that specifies the record to delete.
   * @returns The deleted record.
   */
  readonly delete = async (
    query: Parameters<typeof PopulatedPrisma.delete<T>>[1],
  ) => {
    this.debug('Deleting a record based on query: %o', query);

    const fn = () => PopulatedPrisma.delete(this.model, query);

    return this.withHooks('delete', async () => {
      if (!this.useCache) {
        this.debug('Skipping cache for delete operation');

        return fn();
      }

      const record = await fn();

      void Promise.all([
        this.cache.del(this.buildCacheKey(record)),
        this.clearMutationCache(),
      ]);

      return record;
    });
  };

  /**
   * Delete multiple records from the database.
   * - This operation clears the entire cache for the model, if caching is enabled.
   *   This is because a {@link GetBatchResult} is returned, which does not contain
   *   the individual records that were deleted. If you want to delete records with
   *   selective cache invalidation, use {@link deleteManyAndReturn}.
   * @param query The query that specifies the records to delete.
   * @returns The result of the operation.
   */
  readonly deleteMany = async (
    query?: Parameters<typeof PopulatedPrisma.deleteMany<T>>[1],
  ) => {
    this.debug('Deleting multiple records based on query: %o', query);

    return this.withHooks('deleteMany', () =>
      PopulatedPrisma.deleteMany(this.model, query).then(async (data) => {
        if (this.useCache) {
          void this.clearCache();
        }

        return data;
      }),
    );
  };

  /**
   * Delete multiple records from the database and invalidate the cache for each record.
   * - This operation clears the cache for each record that was deleted, if caching is enabled.
   * - This operation is not a standard Prisma operation.
   * @param query The query that specifies the records to delete.
   * @returns The result of the operation.
   */
  readonly deleteManyAndReturn = async (
    query?: Parameters<typeof PopulatedPrisma.findMany<T>>[1],
  ) => {
    this.debug(
      'Deleting multiple records based on query: %o and returning',
      query,
    );

    const fn = () => PopulatedPrisma.deleteMany(this.model, query?.where);

    return this.withHooks('deleteManyAndReturn', async () => {
      const data = await PopulatedPrisma.findMany(this.model, query);

      if (this.useCache) {
        void Promise.all([
          this.clearMutationCache(),
          ...data.map(async (record) =>
            this.cache.del(this.buildCacheKey(record)),
          ),
        ]);
      }

      await fn();

      return data;
    });
  };

  //
  // Find Operations
  //

  /**
   * Retrieve a record by its ID/primary key.
   * - The record is cached, if caching is enabled.
   * @param id The ID of the record to find.
   * @param cacheResult Whether the found record should be cached.
   * @returns The found record, if any.
   */
  readonly findById = async (
    id: Required<Parameters<typeof PopulatedPrisma.findUnique<T>>[1]['id']>,
    cacheResult = true,
  ) => {
    this.debug('Finding a record by ID: %s', id);

    const fn = () =>
      PopulatedPrisma.findUnique(this.model, {
        id,
      } as unknown as ModelFindUniqueArgs[T]['where']);

    return this.withHooks('findById', async () => {
      if (!this.useCache || !cacheResult) {
        this.debug('Skipping cache for findById operation');

        return fn();
      }

      return this.withNullableCache(
        this.buildCacheKey(id as unknown as string | number),
        fn,
      );
    });
  };

  /**
   * Find the first record that matches the query.
   * - This operation is cached until any record is created, updated, or deleted (aka.
   *   any write operation). This is because mutation queries do not necessarily have to be
   *   based on the primary key of the record. If you want to fully utilize caching,
   *   use {@link findById} instead.
   * @param query The query to use for finding the record.
   * @param cacheResult Whether the found record should be cached.
   * @returns The found record, if any.
   */
  readonly findFirst = async (
    query?: Parameters<typeof PopulatedPrisma.findFirst<T>>[1],
    cacheResult = true,
  ) => {
    this.debug('Finding the first record based on query: %o', query);

    const fn = () => PopulatedPrisma.findFirst(this.model, query);

    return this.withHooks('findFirst', () => {
      if (!this.useCache || !cacheResult) {
        this.debug('Skipping cache for findFirst operation');

        return fn();
      }

      return this.withNullableCache(
        typeof query === 'undefined'
          ? `${this.cachePrefix}:first`
          : `${this.cachePrefix}:first:${CacheManager.hashAny(query)}`,
        fn,
      );
    });
  };

  /**
   * Find the first record that matches the query or throw an error.
   * - This operation is cached until any record is created, updated, or deleted (aka.
   *   any write operation). This is because mutation queries do not necessarily have to be
   *   based on the primary key of the record. If you want to fully utilize caching,
   *   use {@link findById} instead.
   * @param query The query to use for finding the record.
   * @param cacheResult Whether the found record should be cached.
   * @returns The found record.
   */
  readonly findFirstOrThrow = async (
    query?: Parameters<typeof PopulatedPrisma.findFirstOrThrow<T>>[1],
    cacheResult = true,
  ) => {
    this.debug('Finding the first record based on query: %o', query);

    const fn = () => PopulatedPrisma.findFirstOrThrow(this.model, query);

    return this.withHooks('findFirstOrThrow', () => {
      if (!this.useCache || !cacheResult) {
        this.debug('Skipping cache for findFirstOrThrow operation');

        return fn();
      }

      return this.withCache(
        typeof query === 'undefined'
          ? `${this.cachePrefix}:first`
          : `${this.cachePrefix}:first:${CacheManager.hashAny(query)}`,
        fn,
      );
    });
  };

  /**
   * Retrieve multiple records by their IDs/primary keys.
   * - The records are cached, if caching is enabled.
   * @param ids The IDs of the records to find.
   * @param cacheResult Whether the found records should be cached.
   * @returns The found records.
   */
  readonly findManyById = async (
    ids: Required<Parameters<typeof PopulatedPrisma.findUnique<T>>[1]['id']>[],
    cacheResult = true,
  ) => {
    this.debug('Finding multiple records by IDs: %o', ids);

    return this.withHooks('findManyById', async () => {
      if (!this.useCache || !cacheResult) {
        this.debug('Skipping cache for findManyById operation');

        return PopulatedPrisma.findMany(this.model, {
          where: {
            id: {
              in: ids,
            },
          },
        } as unknown as Omit<ModelFindManyArgs[T], 'select' | 'include'>);
      }

      return Promise.all(
        ids.map((id) =>
          this.withNullableCache(
            this.buildCacheKey(id as unknown as string | number),
            () =>
              PopulatedPrisma.findUnique(this.model, {
                id,
              } as unknown as ModelFindUniqueArgs[T]['where']),
          ),
        ),
      );
    });
  };

  /**
   * Find multiple records that match the query.
   * - This operation is cached until any record is created, updated, or deleted (aka.
   *   any write operation). This is because mutation queries do not necessarily have to be
   *   based on the primary key of the record. If you want to fully utilize caching,
   *   use {@link findManyById} instead.
   * @param query The query to use for finding the records.
   * @param cacheResult Whether the results should be cached.
   * @returns The found records.
   */
  readonly findMany = async (
    query?: Parameters<typeof PopulatedPrisma.findMany<T>>[1],
    cacheResult = true,
  ) => {
    this.debug('Finding multiple records based on query: %o', query);

    const fn = () => PopulatedPrisma.findMany(this.model, query);

    return this.withHooks('findMany', async () => {
      if (!this.useCache || !cacheResult) {
        this.debug('Skipping cache for findMany operation');

        return fn();
      }

      const data = (await this.withCache(
        typeof query === 'undefined'
          ? `${this.cachePrefix}:many`
          : `${this.cachePrefix}:many:${CacheManager.hashAny(query)}`,
        fn as () => Promise<CacheType<T>>,
      )) as CacheType<T>[];

      await Promise.all(
        data.map(async (record) => {
          await this.cache.set(this.buildCacheKey(record), record);
        }),
      );

      return data;
    });
  };

  /**
   * Find a unique record that matches the query.
   * - This operation is cached until any record is created, updated, or deleted (aka.
   *   any write operation). This is because mutation queries do not necessarily have to be
   *   based on the primary key of the record. If you want to fully utilize caching,
   *   use {@link findById} instead.
   * @param query The query to use for finding the unique record.
   * @param cacheResult Whether the result should be cached.
   * @returns The found record, if any.
   */
  readonly findUnique = async (
    query: Parameters<typeof PopulatedPrisma.findUnique<T>>[1],
    cacheResult = true,
  ) => {
    this.debug('Finding unique record based on query: %o', query);

    const fn = () => PopulatedPrisma.findUnique(this.model, query);

    return this.withHooks('findUnique', () => {
      if (!this.useCache || !cacheResult) {
        this.debug('Skipping cache for findUnique operation');

        return fn();
      }

      return this.withNullableCache(
        `${this.cachePrefix}:unique:${CacheManager.hashAny(query)}`,
        fn,
      );
    });
  };

  /**
   * Find a unique record that matches the query or throw an error.
   * - This operation is cached until any record is created, updated, or deleted (aka.
   *   any write operation). This is because mutation queries do not necessarily have to be
   *   based on the primary key of the record. If you want to fully utilize caching,
   *   use {@link findById} instead.
   * @param query The query to use for finding the unique record.
   * @param cacheResult Whether the result should be cached.
   * @returns The found record.
   */
  readonly findUniqueOrThrow = async (
    query: Parameters<typeof PopulatedPrisma.findUniqueOrThrow<T>>[1],
    cacheResult = true,
  ) => {
    this.debug('Finding unique record based on query or throwing: %o', query);

    const fn = () => PopulatedPrisma.findUniqueOrThrow(this.model, query);

    return this.withHooks('findUniqueOrThrow', () => {
      if (!this.useCache || !cacheResult) {
        this.debug('Skipping cache for findUniqueOrThrow operation');

        return fn();
      }

      return this.withCache(
        `${this.cachePrefix}:unique:${CacheManager.hashAny(query)}`,
        fn,
      );
    });
  };

  //
  // Group Operations
  //

  /**
   * Group records based on the query.
   * - This operation is not cached.
   * @param query The query to use for grouping.
   * @returns The records, grouped according to the query.
   */
  readonly groupBy = async (
    query: Parameters<typeof PopulatedPrisma.groupBy<T>>[1],
  ) => {
    this.debug('Grouping records based on query: %o', query);

    return this.withHooks('groupBy', () =>
      PopulatedPrisma.groupBy(this.model, query),
    );
  };

  //
  // Update Operations
  //

  /**
   * Update a record in the database by its ID/primary key.
   * - Updating a record updates the cache for the record, if caching is enabled.
   * @param id The ID of the record to update.
   * @param query The query that specifies the record to update.
   * @returns The updated record.
   */
  readonly updateById = async (
    id: Required<Parameters<typeof PopulatedPrisma.findUnique<T>>[1]['id']>,
    query: Omit<Parameters<typeof PopulatedPrisma.update<T>>[1], 'where'>,
  ) => {
    this.debug('Updating a record by ID: %s with query: %o', id, query);

    const fn = () =>
      PopulatedPrisma.update(this.model, {
        where: { id },
        ...query,
      } as unknown as Omit<ModelUpdateArgs[T], 'select' | 'include'>);

    return this.withHooks('updateById', async () => {
      if (!this.useCache) {
        this.debug('Skipping cache for updateById operation');

        return fn();
      }

      const updated = await fn();

      await this.clearMutationCache();
      await this.cache.set(this.buildCacheKey(updated), updated);

      return updated;
    });
  };

  /**
   * Update a record in the database.
   * - This operation is cached until any record is created, updated, or deleted (aka.
   *   any write operation). This is because mutation queries do not necessarily have to be
   *   based on the primary key of the record. If you want to fully utilize caching,
   *   use {@link updateById} instead.
   * @param query The query that specifies the record to update.
   * @param cacheResult Whether the updated record should be cached.
   * @returns The updated record.
   */
  readonly update = async (
    query: Parameters<typeof PopulatedPrisma.update<T>>[1],
    cacheResult = true,
  ) => {
    this.debug('Updating a record based on query: %o', query);

    const fn = () => PopulatedPrisma.update(this.model, query);

    return this.withHooks('update', async () => {
      if (!this.useCache || !cacheResult) {
        this.debug('Skipping cache for update operation');

        return fn();
      }

      const data = await this.findUnique(query.where, false);

      // Note: Prisma throws if update query/where does not match any record,
      // let's have them throw an error with correct/relevant information.
      if (data === null) {
        this.debug(
          'Record not found for update operation, throwing native Prisma error',
        );
        return fn();
      }

      const updated = await fn();

      await this.clearMutationCache();
      await this.cache.set(this.buildCacheKey(updated), updated);

      return updated;
    });
  };

  /**
   * Update multiple records in the database.
   * - This operation clears the entire cache for the model, if caching is enabled.
   *   This is because a {@link GetBatchResult} is returned, which does not contain
   *   the individual records that were updated. If you want to update records with
   *   selective cache invalidation, use {@link updateManyAndReturn}.
   * @param query The query that specifies the records to update.
   * @returns The result of the operation.
   */
  readonly updateMany = async (
    query: Parameters<typeof PopulatedPrisma.updateMany<T>>[1],
  ) => {
    this.debug('Updating multiple records based on query: %o', query);

    return this.withHooks('updateMany', () =>
      PopulatedPrisma.updateMany(this.model, query).then((data) => {
        if (this.useCache) {
          void this.clearCache();
        }

        return data;
      }),
    );
  };

  /**
   * Update multiple records in the database and invalidate the cache for each record.
   * - This operation updates the cache for each record that was updated, if caching is enabled.
   * - This operation is not a standard Prisma operation.
   * @param query The query that specifies the records to update.
   * @returns The result of the operation.
   */
  readonly updateManyAndReturn = async (
    query: Parameters<typeof PopulatedPrisma.updateMany<T>>[1],
  ) => {
    this.debug(
      'Updating multiple records based on query: %o and returning',
      query,
    );

    return this.withHooks('updateManyAndReturn', async () => {
      const data = await PopulatedPrisma.updateMany(this.model, query).then(
        () => {
          return PopulatedPrisma.findMany(this.model, query);
        },
      );

      if (this.useCache) {
        await this.clearMutationCache();
        await Promise.all(
          data.map(async (record) => {
            await this.cache.set(this.buildCacheKey(record), record);
          }),
        );
      }

      return data;
    });
  };

  /**
   * Update a record in the database, creating it if it does not exist.
   * - This operation is not cached (based on input), the updated record is.
   * @param query The query that specifies the record to update. If `update`
   * an empty object, the record will be found or created, and no update will
   * be performed.
   * @returns The created/updated record.
   */
  readonly upsert = async (
    query: Parameters<typeof PopulatedPrisma.upsert<T>>[1],
  ) => {
    this.debug('Upserting a record based on query: %o', query);

    const isFindOrCreate = Object.keys(query.update).length === 0;
    const fn = () =>
      isFindOrCreate
        ? PopulatedPrisma.findUnique(this.model, query.where)
        : PopulatedPrisma.upsert(this.model, query);

    return this.withHooks('upsert', async () => {
      let data = await fn();

      if (data === null) {
        this.debug(
          'Record not found for (isFindOrCreate) upsert operation, creating',
        );
        data = await PopulatedPrisma.create(this.model, query.create);
      }

      if (this.useCache) {
        await this.clearMutationCache();
        await this.cache.set(this.buildCacheKey(data), data);
      } else {
        this.debug('Skipping cache for upsert operation');
      }

      return data;
    });
  };
}

export {
  DatabaseWrapper,
  modelOperations,
  type ModelOperation,
  type CacheType,
  type CacheManagerType,
  type DatabaseWrapperOptions,
};
