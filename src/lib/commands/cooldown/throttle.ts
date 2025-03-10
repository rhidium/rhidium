import { TTLCacheManager } from '../../data-structures';

export type CommandThrottleData = {
  id: string;
  throttleId: string;
  duration: number;
  usages: Date[];
};

export const throttleTTLCache = new TTLCacheManager<CommandThrottleData>({
  capacity: Infinity,
});

export const throttleFromCache = (throttleId: string) => {
  const cached = throttleTTLCache.get(throttleId);
  if (cached) return cached;
  return null;
};
