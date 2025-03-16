import type { CreateCacheOptions, Events } from 'cache-manager';
import EventEmitter from 'events';
import Keyv from 'keyv';

export type AbstractCache<T> = {
  get: (key: string) => Promise<T | null | undefined>;
  mget: (keys: string[]) => Promise<(T | null | undefined)[]>;
  ttl: (key: string) => Promise<number | null>;
  set: (key: string, value: T | null, ttl?: number) => Promise<T | null>;
  mset: (
    list: SetCacheArguments<T | null>[],
  ) => Promise<SetCacheArguments<T | null>[]>;
  del: (key: string) => Promise<boolean>;
  mdel: (keys: string[]) => Promise<[boolean, boolean[]]>;
  clear: () => Promise<boolean>;
  wrap: (
    key: string,
    fnc: () => T | Promise<T>,
    ttl?: number | ((value: T) => number),
    refreshThreshold?: number,
  ) => Promise<T>;
  on: <E extends keyof Events>(event: E, listener: Events[E]) => EventEmitter;
  off: <E extends keyof Events>(event: E, listener: Events[E]) => EventEmitter;
  disconnect: () => Promise<undefined>;
};

export type ResolvedCreateCacheOptions<T extends NonNullable<unknown>> = Omit<
  CreateCacheOptions,
  'stores'
> & { stores: Keyv<T>[] };

export type SetCacheArguments<T> = {
  key: string;
  value: T;
  ttl?: number;
};

export type CacheManagerMetadata = {
  hits: number;
  misses: number;
  added: number;
  deleted: number;
  updated: number;
  cleared: number;
};

export type WithCacheSource = 'cache' | 'no-cache';
export type WithCacheDetails = {
  /** Source of the data */
  source: WithCacheSource;
  /** Whether the data was cached */
  cached: boolean;
  /**
   * - If `cached` is `true`, the time in milliseconds the data was cached for
   * - If `cached` is `false`, the remaining time in milliseconds until the cache expires
   */
  cachedFor: number | null;
};

export type WithCacheDataFn<K, T, O = undefined> = O extends undefined
  ? (key: K) => T | null | undefined | Promise<T | null | undefined>
  : (key: K) => T | O | null | undefined | Promise<T | O | null | undefined>;
export type WithCacheValidator<T, O> = (item: T | O) => item is T;
export type WithCacheTransformer<T, O> = (
  item: T | O,
  details: WithCacheDetails,
) => O extends undefined ? T : T | O;

export type WithCacheReturnType<T extends NonNullable<unknown>> = [
  T | null | undefined,
  WithCacheDetails,
];
export type WithCacheOptions<K, T, O = undefined> = {
  key: K;
  dataFunction: WithCacheDataFn<K, T, O>;
  validationFunction?: WithCacheValidator<T | null | undefined, O>;
  transformFunction?: WithCacheTransformer<T | null | undefined, O>;
  ttl?: number;
};
