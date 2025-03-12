import { UnitConstants } from '../../constants';
import { TTLCacheManager, TTLCacheManagerOptions } from '.';

export interface AsyncTTLCacheManagerOptions<T> extends TTLCacheManagerOptions {
  /** Function to fetch data for a key */
  fetchFunction: (id: string) => Promise<T>;
  /** Callback to run when `fetchFunction` is invoked for a key */
  onKeyFetch?: (key: string) => void | Promise<void>;
  /** Callback to run when `fetchFunction` ran successfully */
  onKeyFetchSuccess?: (
    key: string,
    start: [number, number],
    end: [number, number],
  ) => void | Promise<void>;
  /** Callback to run when `fetchFunction` failed to resolve data */
  onKeyFetchFail?: (
    key: string,
    start: [number, number],
    end: [number, number],
  ) => void | Promise<void>;
}

export class AsyncTTLCacheManager<T> extends TTLCacheManager<T> {
  fetchFunction: (id: string) => Promise<T>;
  onKeyFetch?: (key: string) => void | Promise<void>;
  onKeyFetchSuccess?: (
    key: string,
    start: [number, number],
    end: [number, number],
  ) => void | Promise<void>;
  onKeyFetchFail?: (
    key: string,
    start: [number, number],
    end: [number, number],
  ) => void | Promise<void>;

  /** Number of times a key was fetched from `fetchFunction` */
  fetchHits = 0;
  /** Number of times data for a key wasn't resolve from `fetchFunction` */
  fetchMisses = 0;
  /** Average amount of ms the fetch function takes to resolve data */
  fetchAverageMs = 0;
  /** Fastest time in ms the fetch function has resolved data */
  fetchLowestMs = 0;
  /** Slowest time in ms the fetch function has resolved data */
  fetchHighestMs = 0;
  /** Total amount of ms the fetch function has taken to resolve data */
  fetchTotalMs = 0;

  constructor(options: AsyncTTLCacheManagerOptions<T>) {
    super(options);
    this.fetchFunction = options.fetchFunction;
    if (options.onKeyFetch) this.onKeyFetch = options.onKeyFetch;
    if (options.onKeyFetchSuccess)
      this.onKeyFetchSuccess = options.onKeyFetchSuccess;
    if (options.onKeyFetchFail) this.onKeyFetchFail = options.onKeyFetchFail;
  }

  async getWithFetch(id: string): Promise<T> {
    const cached = super.get(id);
    if (cached) {
      this.cacheHits++;
      return cached;
    }
    this.cacheMisses++;
    if (typeof this.onKeyFetch === 'function') {
      await this.onKeyFetch(id);
    }

    const start = process.hrtime();
    const data = await this.fetchFunction(id);
    const end = process.hrtime(start);
    const ms =
      end[0] * UnitConstants.MS_IN_ONE_SECOND +
      end[1] / UnitConstants.NS_IN_ONE_MS;

    this.fetchTotalMs += ms;
    if (this.fetchHighestMs < ms) this.fetchHighestMs = ms;
    if (this.fetchLowestMs > ms || this.fetchLowestMs === 0)
      this.fetchLowestMs = ms;
    this.fetchAverageMs =
      this.fetchTotalMs / (this.fetchHits + this.fetchMisses);

    if (data === null || typeof data === 'undefined') {
      if (typeof this.onKeyFetchFail === 'function')
        await this.onKeyFetchFail(id, start, end);
      this.fetchMisses++;
      return data;
    }
    if (typeof this.onKeyFetchSuccess === 'function') {
      await this.onKeyFetchSuccess(id, start, end);
      this.fetchHits++;
    }
    this.set(id, data);
    return data;
  }

  async getManyWithFetch(ids: string[]): Promise<T[]> {
    return Promise.all(ids.map((id) => this.getWithFetch(id)));
  }
}
