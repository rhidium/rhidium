import { createCache, type Cache, type Events } from 'cache-manager';
import { createHash } from 'crypto';
import _debug from 'debug';
import EventEmitter from 'events';
import Keyv from 'keyv';
import { type LRUArgs, LRUCache } from './lru-cache';
import {
  type AbstractCache,
  type CacheManagerMetadata,
  type ResolvedCreateCacheOptions,
  type SetCacheArguments,
} from './types';
import { NumberUtils } from '@core/utils';

export class CacheManager<T extends NonNullable<unknown>>
  implements AbstractCache<T>
{
  protected readonly debug = _debug('app:cache:manager');
  readonly cacheOptions: ResolvedCreateCacheOptions<T>;
  readonly metadata: CacheManagerMetadata = {
    hits: 0,
    misses: 0,
    added: 0,
    deleted: 0,
    updated: 0,
    cleared: 0,
  };

  private readonly cache: Cache;
  private readonly cacheKeys: Set<string> = new Set();
  private registerListeners = () => {
    this.on('set', ({ key, error }) => {
      if (!error) {
        this.cacheKeys.add(key);
        this.debug('[SET] New data cached, key tracked', key);
      }
    });
    this.on('del', ({ key, error }) => {
      if (!error) {
        this.cacheKeys.delete(key);
        this.debug('[DELETE] Data removed from cache, key removed', key);
      }
    });
    this.on('clear', () => {
      this.cacheKeys.clear();
      this.debug('[CLEAR] Cache cleared, keys removed');
    });
    this.on('refresh', ({ key, error }) => {
      if (!error) {
        this.debug('[REFRESH] Data refreshed in cache', key);
      }
    });
  };

  //
  // Class instantiation
  //

  constructor(cacheOptions?: ResolvedCreateCacheOptions<T>) {
    this.cacheOptions = cacheOptions ?? { stores: [] };
    this.cache = createCache(cacheOptions);
    this.registerListeners();
  }

  /**
   * Extend the current cache manager with new options, stores, etc.
   * @param options The options to extend the cache manager with
   * @returns A new cache manager
   */
  extend(options?: ResolvedCreateCacheOptions<T>): CacheManager<T> {
    return new CacheManager<T>({ ...this.cacheOptions, ...options });
  }

  /**
   * Create a new cache manager from a store (Keyv or LRUCache)
   * @param store The store to create the cache manager from
   * @returns A new cache manager
   */
  static fromStore<O extends NonNullable<unknown>>(
    store: Keyv<O> | LRUCache<O> | LRUArgs<O>,
  ): CacheManager<O> {
    return new CacheManager<O>({
      stores: [
        store instanceof Keyv
          ? store
          : new Keyv<O>({
              ...store,
              store: store instanceof LRUCache ? store : new LRUCache(store),
            }),
      ],
    });
  }

  //
  // Key management
  //

  /**
   * @returns An array of all keys stored in the cache
   */
  keys(): string[] {
    return Array.from(this.cacheKeys);
  }

  /**
   * @param key The key to check for
   * @returns Whether the key exists in the cache
   */
  hasKey(key: string): boolean {
    return this.cacheKeys.has(key);
  }

  //
  // Standard Cache (Manager) operations
  //

  async get(key: string): Promise<T | null | undefined> {
    this.debug('[GET] Retrieving data from cache', key);
    const jsonFromCache = (await this.cache.get<string>(key)) ?? undefined;
    const fromCache = jsonFromCache
      ? JSON.parse(jsonFromCache, CacheManager.deserializationHelper)
      : undefined;
    const isCacheHit = typeof fromCache !== 'undefined';

    if (isCacheHit) {
      this.metadata.hits++;
      return fromCache;
    }

    this.metadata.misses++;
    return undefined;
  }

  async mget(keys: string[]): Promise<(T | null | undefined)[]> {
    this.debug('[MGET] Retrieving data from cache', keys);
    return Promise.all(keys.map((key) => this.get(key)));
  }

  async ttl(key: string): Promise<number | null> {
    return this.cache.ttl(key);
  }

  async set(key: string, value: T | null, ttl?: number): Promise<T | null> {
    this.debug('[SET] Storing data in cache', key);

    const jsonValue = JSON.stringify(value, NumberUtils.bigIntStringifyHelper);

    return await this.cache.set(key, jsonValue, ttl).then(() => {
      this.metadata.added++;
      return value;
    });
  }

  async mset(
    list: SetCacheArguments<T | null>[],
  ): Promise<SetCacheArguments<T | null>[]> {
    this.debug('[MSET] Storing data in cache', list);
    return Promise.all(
      list.map(({ key, value, ttl }) =>
        this.set(key, value, ttl).then((value) => ({ key, value, ttl })),
      ),
    );
  }

  async del(key: string): Promise<boolean> {
    this.debug('[DELETE] Deleting cache key', key);
    const deleted = await this.cache.del(key);

    if (deleted) {
      this.metadata.deleted++;
    }

    return deleted;
  }

  async mdel(keys: string[]): Promise<[boolean, boolean[]]> {
    this.debug('[MDELETE] Deleting cache keys', keys);

    if (!keys.length) {
      return [false, []];
    }

    return Promise.all(keys.map((key) => this.del(key))).then(
      (results) => [results.some((result) => result), results] as const,
    );
  }

  async clear(): Promise<boolean> {
    this.debug('[CLEAR] Clearing cache');
    const cleared = await this.cache.clear();

    if (cleared) {
      this.metadata.cleared++;
    }

    return cleared;
  }

  async wrap(
    key: string,
    fnc: () => T | Promise<T>,
    ttl?: number | ((value: T) => number),
    refreshThreshold?: number,
  ): Promise<T> {
    this.debug('[WRAP] Wrapping cache function', key);
    return await this.cache.wrap(key, fnc, ttl, refreshThreshold);
  }

  on<E extends keyof Events>(event: E, listener: Events[E]): EventEmitter {
    this.debug('[EVENT] Registering event listener', event);
    return this.cache.on(event, listener);
  }

  off<E extends keyof Events>(event: E, listener: Events[E]): EventEmitter {
    this.debug('[EVENT] Removing event listener', event);
    return this.cache.off(event, listener);
  }

  disconnect(): Promise<undefined> {
    this.debug('[DISCONNECT] Disconnecting from cache');
    return this.cache.disconnect();
  }

  //
  // Prefix utility operations
  //

  /**
   * Get all (cached) keys that match a prefix
   * @param prefix The prefix to filter keys by
   * @returns An array of keys that match the prefix
   */
  keysByPrefix(prefix: string): string[] {
    return Array.from(this.cacheKeys).filter((key) => key.startsWith(prefix));
  }

  /**
   * Clear all keys that match a prefix
   * @param prefix The prefix to filter keys by
   * @returns Whether the cache was cleared, and an array of booleans for each key
   */
  async clearByPrefix(prefix: string): Promise<[boolean, boolean[]]> {
    this.debug('[CLEAR] Clearing cache by prefix', prefix);

    return await this.mdel(this.keysByPrefix(prefix));
  }

  //
  // Wrappers
  //

  /**
   * Check if the item is data (not null or undefined)
   * @param item The item to check
   * @param allowNull Whether to allow null values
   * @returns Whether the item is valid (cache) data
   */
  isData(item: T | null | undefined, allowNull: false): item is T;
  isData(item: T | null | undefined, allowNull?: boolean): item is T | null {
    if (allowNull) {
      return item !== undefined;
    }
    return item !== null && item !== undefined;
  }

  /**
   * Hash any data type into a string, for use as a cache key
   * @param value The value to hash
   * @returns The hashed value as a string
   */
  public static hashAny(value: NonNullable<unknown>): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  /**
   * Deserialization helper for {@link JSON.parse} to handle dates.
   * @param _key The key of the value, unused
   * @param value The value to deserialize
   * @returns The deserialized value
   */
  private static deserializationHelper(_key: string, value: unknown) {
    if (typeof value === 'string' && value.length > 20) {
      const regexp = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\dZ$/.exec(value);
      if (regexp) {
        return new Date(value);
      }
    }
    return value;
  }
}
