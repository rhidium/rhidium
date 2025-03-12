import { prisma } from '@client/database';
import { dbCommandByName } from '@client/database/CommandStatistics';
import { ClientExtensions } from '@client/extensions';
import { Prisma } from '@prisma/client';
import {
  ClientWithCluster,
  ClusterUtils,
  ComponentCommandType,
  Job,
  NumberUtils,
  QueueCallbackFunction,
  QueueManager,
  UnitConstants,
} from '@core';
import { ApplicationCommandType } from 'discord.js';

export type CommandUsageStatistics = {
  commandId: string;
  type: ApplicationCommandType | ComponentCommandType;
  usages: Date[];
  errorCount: number;
  lastUsed: Date | null;
  lastError: string | null;
  lastErrorAt: Date | null;
  runtimeDurations: number[];
};

export const processUsageStatistics: QueueCallbackFunction<
  CommandUsageStatistics[]
> = async (item) => {
  console.log('Processing usage statistics');
  const dataToSave: Prisma.CommandStatisticsGetPayload<
    Record<string, never>
  >[] = [];

  for await (const stat of item) {
    const data =
      dataToSave.find(
        (d) => d.commandId === stat.commandId && d.type === stat.type,
      ) ?? (await dbCommandByName(stat.commandId, stat.type));

    data.usages = [...data.usages, ...stat.usages];
    data.lastUsedAt = stat.lastUsed;

    const firstUsage = data.usages[0];
    if (!data.firstUsedAt && firstUsage) data.firstUsedAt = firstUsage;

    if (data.errorCount > 0) {
      data.errorCount += stat.errorCount;
      data.lastError = stat.lastError;
      data.lastErrorAt = stat.lastErrorAt;
    }

    const totalRuntime = stat.runtimeDurations.reduce((a, b) => a + b, 0);
    const lowestRuntime = Math.min(...stat.runtimeDurations);
    const highestRuntime = Math.max(...stat.runtimeDurations);
    const averageRuntime =
      stat.runtimeDurations.reduce((a, b) => a + b, 0) /
      stat.runtimeDurations.length;

    data.runtimeTotal = data.runtimeTotal
      ? data.runtimeTotal + totalRuntime
      : totalRuntime;
    data.runtimeMax = data.runtimeMax
      ? Math.max(data.runtimeMax, highestRuntime)
      : highestRuntime;
    data.runtimeMin = data.runtimeMin
      ? Math.min(data.runtimeMin, lowestRuntime)
      : lowestRuntime;
    data.runtimeMean = data.runtimeMean
      ? (data.runtimeMean + averageRuntime) / 2
      : averageRuntime;
    data.runtimeMedian = NumberUtils.calculateMedian([
      data.runtimeMean ?? averageRuntime,
      ...stat.runtimeDurations,
    ]);
    data.runtimeVariance = NumberUtils.calculateVariance([
      data.runtimeMean ?? averageRuntime,
      ...stat.runtimeDurations,
    ]);
    data.runtimeStdDeviation = NumberUtils.calculateStandardDeviation([
      data.runtimeMean ?? averageRuntime,
      ...stat.runtimeDurations,
    ]);

    if (dataToSave.find((d) => d.commandId === stat.commandId)) continue;
    else dataToSave.push(data);
  }

  await Promise.all(
    dataToSave.map((data) =>
      prisma.commandStatistics.update({
        where: { commandId: data.commandId, type: data.type },
        data: {
          errorCount: data.errorCount,
          firstUsedAt: data.firstUsedAt,
          lastError: data.lastError,
          lastErrorAt: data.lastErrorAt,
          lastUsedAt: data.lastUsedAt,
          runtimeTotal: data.runtimeTotal,
          runtimeMax: data.runtimeMax,
          runtimeMin: data.runtimeMin,
          runtimeMean: data.runtimeMean,
          runtimeMedian: data.runtimeMedian,
          runtimeVariance: data.runtimeVariance,
          runtimeStdDeviation: data.runtimeStdDeviation,
          usages: { set: data.usages },
        },
      }),
    ),
  );
};

const isProd = process.env.NODE_ENV === 'production';
export const usageStatisticsQueue = new QueueManager<CommandUsageStatistics[]>({
  maxQueueSize: 1,
  stopOnEmpty: true,
  nextDelay: isProd
    ? UnitConstants.MS_IN_ONE_MINUTE * 30
    : UnitConstants.MS_IN_ONE_SECOND * 30,
  waitOnEmpty: isProd
    ? UnitConstants.MS_IN_ONE_MINUTE * 5
    : UnitConstants.MS_IN_ONE_SECOND * 5,
  processFunction: processUsageStatistics,
});

export const clusterProcessUsageStatistics = async (
  client: ClientWithCluster,
) => {
  const noQueueMsg =
    'No usage statistics queue found to cluster usage statistics tracking';
  if (!ClientExtensions.hasUsageStatisticsQueue(client))
    throw new Error(noQueueMsg);

  const cluster = client.cluster;
  let combinedStatistics: CommandUsageStatistics[] = [];
  const originalProcessFunction =
    client.extensions.usageStatisticsQueue.processFunction;
  if (!originalProcessFunction)
    throw new Error(
      'No process function found to cluster usage statistics tracking',
    );

  const results = await cluster.broadcastEval(
    async (c, { noQueueMsg }) => {
      const stats: CommandUsageStatistics[] = [];
      if (
        !c.extensions.usageStatisticsQueue ||
        typeof c.extensions.usageStatisticsQueue !== 'object'
      )
        throw new Error(noQueueMsg);
      // Type cast to avoid type errors, doesn't compile, so we can use out of scope reference
      const usageStatsQueue = c.extensions
        .usageStatisticsQueue as typeof usageStatisticsQueue;
      usageStatsQueue.stopOnEmpty = true;
      usageStatsQueue.processFunction = (item) => {
        stats.push(...item);
      };
      await usageStatsQueue.process();
      return stats;
    },
    { context: { noQueueMsg } },
  );

  results.forEach((stats) => {
    combinedStatistics.push(
      ...stats.map((e) => ({
        commandId: e.commandId,
        type: e.type,
        usages: e.usages.map((e) => new Date(e)),
        errorCount: e.errorCount,
        lastUsed: e.lastUsed ? new Date(e.lastUsed) : null,
        lastError: e.lastError,
        lastErrorAt: e.lastErrorAt ? new Date(e.lastErrorAt) : null,
        runtimeDurations: e.runtimeDurations,
      })),
    );
  });

  void originalProcessFunction(combinedStatistics);
  combinedStatistics = [];
};

const ProcessUsageStatisticsJob = new Job({
  id: 'process-usage-statistics',
  run: async (client) => {
    if (ClusterUtils.hasCluster(client)) {
      if (client.cluster.id === 0) await clusterProcessUsageStatistics(client);
      else return; // Only process on cluster 0
    } else await usageStatisticsQueue.process();
  },
  interval: usageStatisticsQueue.nextDelay,
});

export default ProcessUsageStatisticsJob;
