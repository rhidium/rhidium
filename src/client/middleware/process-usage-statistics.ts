import { ApplicationCommandType } from 'discord.js';
import {
  ChatInputCommand,
  CommandMiddlewareFunctionWithResult,
  MessageContextCommand,
  UserContextCommand,
} from '@core';
import { ClientExtensions } from '@client/extensions';

export const processUsageStatisticsMiddleware: CommandMiddlewareFunctionWithResult =
  async ({ client, interaction, startRunTs, invokedAt, next, error }) => {
    const commandId = client.commandManager.resolveCommandId(interaction);
    const command = client.commandManager.commandById(commandId);

    if (!command) return next();
    if (!ClientExtensions.hasUsageStatisticsQueue(client))
      throw new Error(
        'No usage statistics queue found to process usage statistics',
      );

    // Update usage statistics
    const endRunTs = process.hrtime(startRunTs);
    const runTimeMs = endRunTs[0] * 1000 + endRunTs[1] / 1000000;
    const { usageStatisticsQueue } = client.extensions;
    const usageStatistics = usageStatisticsQueue.peek();
    const cmdType =
      command instanceof ChatInputCommand
        ? ApplicationCommandType.ChatInput
        : command instanceof UserContextCommand
          ? ApplicationCommandType.User
          : command instanceof MessageContextCommand
            ? ApplicationCommandType.Message
            : command.type;

    const commandIdWithType = `${commandId}@${cmdType}`;
    const createStatisticsData = {
      commandId: commandIdWithType,
      type: cmdType,
      usages: [invokedAt],
      errorCount: error ? 1 : 0,
      lastUsed: new Date(),
      lastError: error?.message ?? null,
      lastErrorAt: error ? new Date() : null,
      runtimeDurations: [runTimeMs],
    };
    if (!usageStatistics) {
      usageStatisticsQueue.add([createStatisticsData]);
    } else {
      const cmdEntry = usageStatistics.find(
        (x) => x.commandId === commandIdWithType,
      );
      if (cmdEntry) {
        cmdEntry.usages.push(invokedAt);
        if (error) {
          cmdEntry.errorCount++;
          cmdEntry.lastError = error.message;
          cmdEntry.lastErrorAt = new Date();
        }
        cmdEntry.lastUsed = new Date();
        cmdEntry.runtimeDurations.push(runTimeMs);
      } else usageStatistics.push(createStatisticsData);
    }

    next();
  };
