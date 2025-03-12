import { stringCommandTypeFromInteger } from '@client/chat-input/Developer/command-usage/helpers';
import {
  COMMAND_STATISTICS_ROOT_ID,
  CommandStatisticsPayload,
  commandStatisticsTTLCache,
} from '@client/database/CommandStatistics';
import { AutoCompleteOption } from '@core';

const CommandStatisticOption = new AutoCompleteOption<CommandStatisticsPayload>(
  {
    name: 'command-statistic',
    description: 'Select the command to display statistics for',
    required: true,
    resolveValue: async (rawValue) => {
      const allStats = await commandStatisticsTTLCache.getWithFetch(
        COMMAND_STATISTICS_ROOT_ID,
      );
      if (!allStats) return null;

      const stat = allStats.find((s) => s.commandId === rawValue);
      if (!stat) return null;
      return stat;
    },
    run: async (query) => {
      const allStats = await commandStatisticsTTLCache.getWithFetch(
        COMMAND_STATISTICS_ROOT_ID,
      );
      if (!allStats) return [];

      const stats = allStats.filter((s) => s.commandId.startsWith(query));
      if (!stats.length) return [];

      return stats.map((stat) => {
        const [commandName, type] = stat.commandId.split('@');
        return {
          name: `${commandName} (${stringCommandTypeFromInteger(Number(type)).replaceAll('*', '')})`,
          value: stat.commandId,
        };
      });
    },
  },
);

export default CommandStatisticOption;
