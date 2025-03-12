import { Prisma } from '@prisma/client';
import { prisma } from '.';
import { AsyncTTLCacheManager } from '../data-structures';
import { UnitConstants } from '../constants';

export type PopulatedGuild = Prisma.GuildGetPayload<{
  include: {
    MemberJoinEmbed: {
      include: { fields: true };
    };
    MemberLeaveEmbed: {
      include: { fields: true };
    };
  };
}>;

export const guildFromDb = async (guildId: string): Promise<PopulatedGuild> => {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: {
      MemberJoinEmbed: {
        include: { fields: true },
      },
      MemberLeaveEmbed: {
        include: { fields: true },
      },
    },
  });

  return (
    guild ??
    (await prisma.guild.create({
      data: { id: guildId },
      include: {
        MemberJoinEmbed: {
          include: { fields: true },
        },
        MemberLeaveEmbed: {
          include: { fields: true },
        },
      },
    }))
  );
};

export const guildTTLCache = new AsyncTTLCacheManager<PopulatedGuild>({
  fetchFunction: guildFromDb,
  capacity: 500,
  ttl: UnitConstants.MS_IN_ONE_DAY,
});

export const guildFromCache = async (guildId: string) => {
  return guildTTLCache.getWithFetch(guildId);
};

export const updateGuild = async (
  guildSettings: PopulatedGuild,
  updateArgs: Omit<Prisma.GuildUpdateArgs, 'where'>,
): Promise<PopulatedGuild> => {
  const updatedGuild = await prisma.guild.update({
    ...updateArgs,
    where: {
      id: guildSettings.id,
    },
    include: {
      MemberJoinEmbed: {
        include: { fields: true },
      },
      MemberLeaveEmbed: {
        include: { fields: true },
      },
    },
  });
  guildTTLCache.set(guildSettings.id, updatedGuild);
  return updatedGuild;
};
