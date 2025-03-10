import { ApplicationCommandType } from 'discord.js';
import { prisma } from '.';
import { Prisma } from '@prisma/client';
import {
  AsyncTTLCacheManager,
  ComponentCommandType,
  UnitConstants,
} from '@lib';

export type CommandStatisticsPayload = Prisma.CommandStatisticsGetPayload<
  Record<string, never>
>;

export const COMMAND_STATISTICS_ROOT_ID = 'ignored-param';

// Database is only updated once every 30 minutes
// and this cache is only used to get the full collection
export const commandStatisticsTTLCache = new AsyncTTLCacheManager<
  CommandStatisticsPayload[]
>({
  fetchFunction: async () => prisma.commandStatistics.findMany(),
  capacity: 1,
  ttl: UnitConstants.MS_IN_ONE_MINUTE * 30,
});

export const dbCommandByName = async (
  name: string,
  type: ApplicationCommandType | ComponentCommandType,
) =>
  prisma.commandStatistics.upsert({
    where: { commandId: name, type },
    create: { commandId: name, type },
    update: {},
  });
