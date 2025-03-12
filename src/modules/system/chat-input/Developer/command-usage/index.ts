import { SlashCommandBuilder } from 'discord.js';
import { CommandUsageConstants } from './enums';
import {
  deleteItemSubcommand,
  itemSubcommand,
  leaderboardSubcommand,
} from './options';
import {
  compactEmbedFromUsageStatistics,
  embedFromUsageStatistics,
  stringCommandTypeFromInteger,
} from './helpers';
import CommandStatisticOption from '../../../auto-completes/command-statistic';
import {
  ArrayUtils,
  COMMAND_STATISTICS_ROOT_ID,
  ChatInputCommand,
  InteractionUtils,
  PermLevel,
  commandStatisticsTTLCache,
  isAutoCompleteResponseType,
  prisma,
} from '@core';

export const compactEntriesPerPage = 10;

const CommandUsageCommand = new ChatInputCommand({
  permLevel: PermLevel['Bot Administrator'],
  data: new SlashCommandBuilder()
    .setDescription('View detailed command usage information')
    .addSubcommand(leaderboardSubcommand)
    .addSubcommand(itemSubcommand)
    .addSubcommand(deleteItemSubcommand),
  run: async (client, interaction) => {
    const { options } = interaction;
    const compact = options.getBoolean('compact') ?? false;

    const subcommand = options.getSubcommand();
    if (subcommand === CommandUsageConstants.LEADERBOARD_SUBCOMMAND_NAME) {
      const allStats = await commandStatisticsTTLCache.getWithFetch(
        COMMAND_STATISTICS_ROOT_ID,
      );
      if (!allStats || !allStats[0]) {
        await CommandUsageCommand.reply(
          interaction,
          'No command usage statistics were found',
        );
        return;
      }

      const stats = allStats.sort((a, b) => b.usages.length - a.usages.length);
      const allEmbeds = compact
        ? ArrayUtils.chunk(stats, compactEntriesPerPage).map((stat, ind) =>
            compactEmbedFromUsageStatistics(
              client,
              stat,
              ind * compactEntriesPerPage,
            ),
          )
        : stats.map((stat) => embedFromUsageStatistics(client, stat));

      await InteractionUtils.paginator(
        'command-usage-leaderboard',
        client,
        allEmbeds.map((e) => ({ embeds: Array.isArray(e) ? e : [e] })),
        interaction,
        undefined,
        { ephemeral: CommandUsageCommand.isEphemeral },
      );
    } else if (subcommand === CommandUsageConstants.ITEM_SUBCOMMAND_NAME) {
      const value = await CommandStatisticOption.getValue(interaction, true);
      if (isAutoCompleteResponseType(value)) return;
      const embed = embedFromUsageStatistics(client, value);
      await CommandUsageCommand.reply(interaction, embed);
    } else if (
      subcommand === CommandUsageConstants.DELETE_ITEM_SUBCOMMAND_NAME
    ) {
      const value = await CommandStatisticOption.getValue(interaction, true);
      if (isAutoCompleteResponseType(value)) return;
      await prisma.commandStatistics.delete({ where: { id: value.id } });
      commandStatisticsTTLCache.delete(COMMAND_STATISTICS_ROOT_ID);
      await CommandUsageCommand.reply(
        interaction,
        `Successfully deleted usage statistics for \`${value.commandId}\` (${stringCommandTypeFromInteger(value.type)})`,
      );
    }
  },
});

export default CommandUsageCommand;
