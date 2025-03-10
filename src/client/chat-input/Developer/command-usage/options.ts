import { SlashCommandSubcommandBuilder } from 'discord.js';
import { CommandUsageConstants } from './enums';
import CommandStatisticOption from '@client/auto-completes/command-statistic';

export const leaderboardSubcommand = new SlashCommandSubcommandBuilder()
  .setName(CommandUsageConstants.LEADERBOARD_SUBCOMMAND_NAME)
  .setDescription('View the leaderboard for most used commands & components')
  .addBooleanOption((option) =>
    option
      .setName('compact')
      .setDescription(
        'Wether or not to display the leaderboard in a compact format, default false',
      )
      .setRequired(false),
  );

export const itemSubcommand = new SlashCommandSubcommandBuilder()
  .setName(CommandUsageConstants.ITEM_SUBCOMMAND_NAME)
  .setDescription(
    'View detailed usage information for a specific command/component',
  )
  .addStringOption(CommandStatisticOption.addOptionHandler);

export const deleteItemSubcommand = new SlashCommandSubcommandBuilder()
  .setName(CommandUsageConstants.DELETE_ITEM_SUBCOMMAND_NAME)
  .setDescription('Delete a specific command/component from the database')
  .addStringOption(CommandStatisticOption.addOptionHandler);
