import { UnitConstants } from 'lib/constants';

export const DEFAULT_CAPACITY = null;
export const DEFAULT_TTL = UnitConstants.MS_IN_ONE_HOUR;

export enum RemoveReason {
  REQUESTED = 'Requested',
  TTL_EXPIRED = 'TTL expired',
  CAPACITY_EXCEEDED = 'Capacity exceeded',
}

export interface TTLCacheManagerOptions {
  /** Time to live for data added to this cache */
  ttl?: number;
  /** Maximum number of items to store in this cache */
  capacity?: number | null;
  /** Callback to run when a key is added */
  onKeyAdd?: (key: string) => void | Promise<void>;
  /** Callback to run when a key expires */
  onKeyExpire?: (key: string) => void | Promise<void>;
  /** Callback to run when a key is deleted */
  onKeyDelete?: (key: string, reason?: string) => void | Promise<void>;
  /** Callback to run when a key is updated */
  onKeyUpdate?: (key: string) => void | Promise<void>;
  /** Callback to run when cache capacity is exceeded */
  onCapacityExceeded?: (key: string) => void | Promise<void>;
  /** Callback to run when cache is cleared */
  onClear?: (itemCount: number) => void | Promise<void>;
}

export class TTLCacheManager<T>
  extends Map<string, T>
  implements TTLCacheManagerOptions
{
  ttl: number;
  capacity: number | null;
  onKeyAdd?: (key: string) => void | Promise<void>;
  onKeyExpire?: (key: string) => void | Promise<void>;
  onKeyDelete?: (key: string, reason?: string) => void | Promise<void>;
  onKeyUpdate?: (key: string) => void | Promise<void>;
  onCapacityExceeded?: (key: string) => void | Promise<void>;
  onClear?: (itemCount: number) => void | Promise<void>;
  cacheHits = 0;
  cacheMisses = 0;
  cacheDeletes = 0;
  cacheUpdates = 0;
  cacheAdds = 0;
  cacheExpirations = 0;
  cacheCapacityExceeded = 0;
  cacheClears = 0;

  /** Map of TimeoutIds for each key - used to track TTL */
  private expireIds = new Map<string, NodeJS.Timeout>();

  constructor(options: TTLCacheManagerOptions) {
    super();
    this.ttl = options.ttl ?? DEFAULT_TTL;
    this.capacity = options.capacity ?? DEFAULT_CAPACITY;
    if (options.onKeyAdd) this.onKeyAdd = options.onKeyAdd;
    if (options.onKeyExpire) this.onKeyExpire = options.onKeyExpire;
    if (options.onKeyDelete) this.onKeyDelete = options.onKeyDelete;
    if (options.onKeyUpdate) this.onKeyUpdate = options.onKeyUpdate;
    if (options.onClear) this.onClear = options.onClear;
    if (options.onCapacityExceeded)
      this.onCapacityExceeded = options.onCapacityExceeded;
  }

  override get(key: string): T | undefined {
    const value = super.get(key);
    if (value) {
      this.cacheHits++;
      return value;
    }
    this.cacheMisses++;
    return undefined;
  }

  override async clear(): Promise<void> {
    const itemCount = this.size;
    super.clear();
    this.clearAllTtl();
    this.cacheClears++;
    if (typeof this.onClear === 'function') {
      await this.onClear(itemCount);
    }
  }

  override delete(key: string, reason = RemoveReason.REQUESTED): boolean {
    const hasKey = this.has(key);
    this.clearKeyTtl(key);
    if (hasKey) {
      this.cacheDeletes++;
      if (typeof this.onKeyDelete === 'function')
        void this.onKeyDelete(key, reason);
    }
    return super.delete(key);
  }

  override set(key: string, value: T, ttl = this.ttl): this {
    const hasKey = this.has(key);
    this.clearKeyTtl(key);
    super.set(key, value);
    this.setKeyTtl(key, ttl);
    void this.handleMaxCapacity();
    if (!hasKey) {
      this.cacheAdds++;
      if (typeof this.onKeyAdd === 'function') void this.onKeyAdd(key);
    } else {
      this.cacheUpdates++;
      if (typeof this.onKeyUpdate === 'function') void this.onKeyUpdate(key);
    }
    return this;
  }

  async handleMaxCapacity(): Promise<void> {
    if (this.capacity && this.size > this.capacity) {
      const key = this.keys().next().value;
      if (!key) return;
      this.cacheCapacityExceeded++;
      if (typeof this.onCapacityExceeded === 'function') {
        await this.onCapacityExceeded(key);
      }
      this.delete(key, RemoveReason.CAPACITY_EXCEEDED);
    }
  }

  expireKey(key: string): boolean {
    const hasKey = this.has(key);
    if (hasKey) {
      this.cacheExpirations++;
      if (typeof this.onKeyExpire === 'function') void this.onKeyExpire(key);
    } else return false;
    this.delete(key, RemoveReason.TTL_EXPIRED);
    return true;
  }

  setKeyTtl(key: string, ttl: number): boolean {
    if (this.expireIds.has(key)) {
      clearTimeout(this.expireIds.get(key));
    }
    const value = this.get(key);
    if (value) {
      const timeoutId = setTimeout(() => {
        this.expireKey(key);
      }, ttl);
      this.expireIds.set(key, timeoutId);
    }
    return !!value;
  }

  clearKeyTtl(key: string): boolean {
    if (this.expireIds.has(key)) {
      clearTimeout(this.expireIds.get(key));
      return true;
    }
    return false;
  }

  clearAllTtl(): void {
    this.expireIds.forEach((timeout) => clearTimeout(timeout));
    this.expireIds.clear();
  }

  getMany(keys: string[]): (T | undefined)[] {
    return keys.map((key) => this.get(key));
  }

  deleteMany(keys: string[], reason = RemoveReason.REQUESTED): boolean[] {
    return keys.map((key) => this.delete(key, reason));
  }

  setMany(keyValuePairs: [string, T][], ttl = this.ttl): this {
    keyValuePairs.forEach(([key, value]) => this.set(key, value, ttl));
    return this;
  }

  setManyKeyTtl(keys: string[], ttl: number): boolean[] {
    return keys.map((key) => this.setKeyTtl(key, ttl));
  }

  clearManyKeyTtl(keys: string[]): boolean[] {
    return keys.map((key) => this.clearKeyTtl(key));
  }
}
