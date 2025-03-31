export type PromiseGenerator<T> = () => Promise<T>;

/**
 * A simple caching mechanism for promises that:
 * - Caches the result of a promise for a specified duration.
 * - Prevents redundant calls by returning the cached promise when available.
 */
export class PromiseCache<T> {
  private cache: Promise<T> | null = null;
  private expirationTime: number | null = null;

  constructor(private maxAge?: number | null) {}

  private cacheValid(): Promise<T> | false {
    return this.cache !== null &&
      (this.expirationTime === null || this.expirationTime > Date.now())
      ? this.cache
      : false;
  }

  async get(generator: PromiseGenerator<T>): Promise<T> {
    const cached = this.cacheValid();

    if (cached !== false) {
      return cached;
    }

    this.cache = (async () => {
      try {
        if (typeof this.maxAge === 'number' && this.maxAge > 0) {
          this.expirationTime = Date.now() + this.maxAge;
          setTimeout(() => this.clear(), this.maxAge);
        }

        return await generator();
      } catch (error) {
        this.clear();
        throw error;
      }
    })();

    return this.cache;
  }

  clear() {
    this.cache = null;
    this.expirationTime = null;
  }
}
