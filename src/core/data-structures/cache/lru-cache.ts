import { LRUCache as _LRUCache } from 'lru-cache';

export {
  type BackgroundFetch as LRUBackgroundFetch,
  type DisposeTask as LRUDisposeTask,
  type Index as LRUIndex,
  type NumberArray as LRUNumberArray,
  type PosInt as LRUPosInt,
  type Stack as LRUStack,
  type StackLike as LRUStackLike,
  type UintArray as LRUUintArray,
  type ZeroArray as LRUZeroArray,
} from 'lru-cache';

export class LRUCache<T extends NonNullable<unknown>> extends _LRUCache<
  string,
  T,
  unknown
> {
  constructor(options: LRUArgs<T>) {
    super(options);
  }
}

export type LRUArgs<T extends NonNullable<unknown>> = ConstructorParameters<
  typeof _LRUCache<string, T, unknown>
>[0];
