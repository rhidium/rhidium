import { AsyncTTLCacheManager, UnitConstants } from '@core';
import { prisma } from '.';
import { CommandCooldown, Prisma } from '@prisma/client';

const cooldownFromDb = async (cooldownId: string) =>
  await prisma.commandCooldown.findUnique({
    where: { cooldownId },
  });

export const cooldownTTLCache = new AsyncTTLCacheManager<
  Awaited<ReturnType<typeof cooldownFromDb>>
>({
  fetchFunction: cooldownFromDb,
  ttl: UnitConstants.MS_IN_ONE_DAY,
});

export const cooldownFromCache = async (cooldownId: string) => {
  return cooldownTTLCache.getWithFetch(cooldownId);
};

export const updateCooldown = async (
  cooldown: CommandCooldown,
  updateArgs: Omit<Prisma.CommandCooldownUpdateArgs, 'where'>,
) => {
  const updatedCooldown = await prisma.commandCooldown.update({
    where: { cooldownId: cooldown.cooldownId },
    ...updateArgs,
  });
  cooldownTTLCache.set(cooldown.cooldownId, updatedCooldown);
  return updatedCooldown;
};
