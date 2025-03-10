import { Prisma } from '@prisma/client';
import { prisma } from '.';
import { AsyncTTLCacheManager, UnitConstants } from '@rhidium/core';

export type GuildWithEmbeds = Prisma.GuildGetPayload<{
  include: {
    memberJoinEmbed: {
      include: { fields: true };
    };
    memberLeaveEmbed: {
      include: { fields: true };
    };
  };
}>;

// Note: Unfortunately, we can't use a guildIncludes constant here
// to avoid code repetition, not 100% sure why

export const guildSettingsFromDb = async (
  guildId: string,
): Promise<GuildWithEmbeds> => {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: {
      memberJoinEmbed: {
        include: { fields: true },
      },
      memberLeaveEmbed: {
        include: { fields: true },
      },
    },
  });
  return (
    guild ??
    (await prisma.guild.create({
      data: { id: guildId },
      include: {
        memberJoinEmbed: {
          include: { fields: true },
        },
        memberLeaveEmbed: {
          include: { fields: true },
        },
      },
    }))
  );
};

export const guildTTLCache = new AsyncTTLCacheManager<GuildWithEmbeds>({
  fetchFunction: guildSettingsFromDb,
  capacity: 500,
  ttl: UnitConstants.MS_IN_ONE_DAY,
});

export const guildSettingsFromCache = async (guildId: string) => {
  return guildTTLCache.getWithFetch(guildId);
};

/** Convenience method  */
export const updateGuildSettings = async (
  guildSettings: GuildWithEmbeds,
  updateArgs: Omit<Prisma.GuildUpdateArgs, 'where'>,
): Promise<GuildWithEmbeds> => {
  const updatedGuild = await prisma.guild.update({
    ...updateArgs,
    where: {
      id: guildSettings.id,
    },
    include: {
      memberJoinEmbed: {
        include: { fields: true },
      },
      memberLeaveEmbed: {
        include: { fields: true },
      },
    },
  });
  guildTTLCache.set(guildSettings.id, updatedGuild);
  return updatedGuild;
};
