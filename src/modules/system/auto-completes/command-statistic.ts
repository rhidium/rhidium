import { stringCommandTypeFromInteger } from '../chat-input/Developer/command-usage/helpers';
import {
  AutoCompleteOption,
  Database,
  PopulatedCommandStatistics,
} from '@core';

const CommandStatisticOption =
  new AutoCompleteOption<PopulatedCommandStatistics>({
    name: 'command-statistic',
    description: 'Select the command to display statistics for',
    required: true,
    resolveValue: async (rawValue) => {
      const allStats = await Database.CommandStatistics.findMany();
      const stat = allStats.find((s) => s.commandId === rawValue);
      if (!stat) return null;
      return stat;
    },
    run: async (query) => {
      const allStats = await Database.CommandStatistics.findMany();
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
  });

export default CommandStatisticOption;
