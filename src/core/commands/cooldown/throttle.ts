import { UnitConstants } from '../../constants';
import { CacheManager } from '../../data-structures';

export type CommandThrottleData = {
  id: string;
  throttleId: string;
  duration: number;
  usages: Date[];
};

const throttleTTLCache = CacheManager.fromStore<CommandThrottleData>({
  ttl: UnitConstants.MS_IN_ONE_HOUR,
  max: 500,
  updateAgeOnGet: true,
  updateAgeOnHas: false,
});

export const throttleFromCache = async (throttleId: string) => {
  const cached = await throttleTTLCache.get(throttleId);
  if (cached) return cached;
  return null;
};

export const setThrottleInCache = async (
  data: CommandThrottleData,
  ttl?: number,
) => {
  await throttleTTLCache.set(data.throttleId, data, ttl);
};
