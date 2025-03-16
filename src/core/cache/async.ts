import _debug from 'debug';
import Keyv from 'keyv';
import { LRUArgs, LRUCache } from './lru-cache';
import { CacheManager } from './manager';
import {
  CacheManagerMetadata,
  ResolvedCreateCacheOptions,
  WithCacheDataFn,
  WithCacheDetails,
  WithCacheReturnType,
} from './types';

export type AsyncCreateCacheOptions<T extends NonNullable<unknown>> =
  ResolvedCreateCacheOptions<T> & {
    /**
     * The function that fetches/processed data for a key. The function is ran
     * when the key is not found in the cache, and the data is stored in the cache.
     * - Values of type `null` are treated as cache, and will be stored as `null`.
     * - Values of type `undefined` are treated as no-cache, and will not be stored.
     * - __You are responsible for error handling in this function.__
     * - __Any unhandled errors will throw, and terminate your process.__
     * @param key The key to fetch/process data for
     * @returns The data for the key
     */
    dataFunction: WithCacheDataFn<string, T>;
    /**
     * Callbacks to run at various stages of the asynchronous caching process.
     */
    callbacks?: AsyncCacheManagerCallbacks<T>;
  };

export type AsyncCacheManagerCallbacks<T extends NonNullable<unknown>> = {
  /**
   * Callback to execute when `dataFunction` starts. This callback is always executed,
   * and ran just before the function is called.
   * @param key The key passed to `dataFunction`
   */
  onStart?: (key: string) => void;
  /**
   * Callback to execute when `dataFunction` ends. This callback is always executed,
   * and ran just after the function finishes/resolves.
   * @param key The key passed to `dataFunction`
   * @param duration The duration of `dataFunction` in milliseconds
   * @returns
   */
  onEnd?: (key: string, duration: number) => void;
  /**
   * Callback to execute when `dataFunction` is successful. This callback is only
   * executed if the function resolves successfully, without erroring/throwing.
   * @param key  The key passed to `dataFunction`
   * @param value The value that was returned/resolved by `dataFunction`
   * @returns
   */
  onSuccess?: (key: string, value: T | null) => void;
  /**
   * Callback to execute when an error occurs while running `dataFunction`.
   * - __Please note that this callback does not affect error handling.__
   * - __If your `dataFunction` errors and this callback is provided, an error is still thrown.__
   * @param key The key passed to `dataFunction`
   * @param error The error that occurred while running `dataFunction`
   */
  onError?: (key: string, error: Error) => void;
};

export type AsyncCacheManagerMetadata = CacheManagerMetadata & {
  /** The number/amount of errors that occurred while processing data */
  errors: number;
  /** Metadata specific to async operations */
  async: {
    /** The duration of the last `dataFunction` in milliseconds */
    last: number;
    /** The total duration the `dataFunction` has taken in milliseconds */
    total: number;
    /** The average duration of all `dataFunction` runs in milliseconds */
    average: number;
    /** The longest duration of all `dataFunction` runs in milliseconds */
    longest: number;
    /** The shortest duration of all `dataFunction` runs in milliseconds */
    shortest: number;
  };
};

export class AsyncCacheManager<
  T extends NonNullable<unknown>,
> extends CacheManager<T> {
  protected override readonly debug = _debug('@repo/cache:async-manager');
  override readonly cacheOptions: AsyncCreateCacheOptions<T>;
  override readonly metadata: AsyncCacheManagerMetadata = {
    hits: 0,
    misses: 0,
    added: 0,
    deleted: 0,
    updated: 0,
    cleared: 0,
    errors: 0,
    async: {
      last: 0,
      total: 0,
      average: 0,
      longest: 0,
      shortest: 0,
    },
  };

  private readonly dataFunction: WithCacheDataFn<string, T>;

  //
  // Class instantiation
  //

  constructor(options: AsyncCreateCacheOptions<T>) {
    super(options);
    this.cacheOptions = options;
    this.dataFunction = options.dataFunction;
  }

  override extend(options?: AsyncCreateCacheOptions<T>): AsyncCacheManager<T> {
    return new AsyncCacheManager({ ...this.cacheOptions, ...options });
  }

  static override fromStore<O extends NonNullable<unknown>>(
    store: (Keyv<O> | LRUCache<O> | LRUArgs<O>) & {
      dataFunction: WithCacheDataFn<string, O>;
    },
  ): AsyncCacheManager<O> {
    return new AsyncCacheManager<O>({
      dataFunction: store.dataFunction,
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
  // Standard Cache (Manager) operations
  //

  override async get(key: string): Promise<T | null | undefined> {
    const fromCache = await super.get(key);

    if (typeof fromCache !== 'undefined') {
      return fromCache;
    }

    const wrapperResult = await this.dataWrapper(key);

    if (typeof wrapperResult !== 'undefined') {
      await this.set(key, wrapperResult);
    }

    return wrapperResult;
  }

  async getWithDetails(key: string): Promise<WithCacheReturnType<T>> {
    const fromCache = await super.get(key);

    if (typeof fromCache !== 'undefined') {
      return [fromCache, { source: 'cache', cached: false, cachedFor: null }];
    }

    const wrapperResult = await this.dataWrapper(key);

    let details: WithCacheDetails;

    if (typeof wrapperResult !== 'undefined') {
      await this.set(key, wrapperResult);
      details = {
        source: 'no-cache',
        cached: true,
        cachedFor: await this.ttl(key),
      };
    } else {
      details = { source: 'no-cache', cached: false, cachedFor: null };
    }

    return [wrapperResult, details];
  }

  //
  // Wrappers
  //

  private readonly dataWrapper = async (
    key: string,
  ): Promise<T | null | undefined> => {
    const start = process.hrtime();

    if (this.cacheOptions.callbacks?.onStart) {
      this.cacheOptions.callbacks.onStart(key);
    }

    let result: ReturnType<typeof this.dataFunction>;
    let resolvedResult: T | null | undefined;
    let isUserCallbackError = false;

    try {
      result = this.dataFunction(key);
      resolvedResult = result instanceof Promise ? await result : result;
      if (
        typeof resolvedResult !== 'undefined' &&
        this.cacheOptions.callbacks?.onSuccess
      ) {
        isUserCallbackError = true;
        this.cacheOptions.callbacks.onSuccess(key, resolvedResult);
      }
    } catch (err) {
      const reason = isUserCallbackError
        ? 'Error in onSuccess callback for key'
        : 'Failed to fetch/process data for key';
      const cleanError =
        typeof err === 'object' && err && 'message' in err
          ? new Error(`${reason} "${key}": ${err.message}`)
          : new Error(`${reason} "${key}": ${err}`);

      this.metadata.errors++;
      delete cleanError.stack;

      if (this.cacheOptions.callbacks?.onError) {
        this.cacheOptions.callbacks.onError(key, cleanError);
      }

      throw cleanError;
    } finally {
      const end = process.hrtime(start);
      const duration = end[0] * 1e3 + end[1] / 1e6;

      this.metadata.async.last = duration;
      this.metadata.async.total += duration;
      this.metadata.async.average =
        this.metadata.async.total / this.metadata.hits;
      this.metadata.async.longest = Math.max(
        this.metadata.async.longest,
        duration,
      );
      this.metadata.async.shortest = Math.min(
        this.metadata.async.shortest,
        duration,
      );

      if (this.cacheOptions.callbacks?.onEnd) {
        this.cacheOptions.callbacks.onEnd(key, duration);
      }
    }

    return resolvedResult;
  };
}
