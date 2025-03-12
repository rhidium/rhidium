import {
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from 'discord.js';
import { PlaceholderConstants } from './enums';
import PlaceholderOption from '../../../auto-completes/placeholder';
import PlaceholderGroupOption from '../../../auto-completes/placeholder-group';

export const listPlaceholderSubcommandGroup =
  new SlashCommandSubcommandGroupBuilder()
    .setName(PlaceholderConstants.LIST_SUBCOMMAND_GROUP_NAME)
    .setDescription('List all available placeholders')
    .addSubcommand((subcommand) =>
      subcommand
        .setName(PlaceholderConstants.LIST_PLACEHOLDER_GROUPS_SUBCOMMAND_NAME)
        .setDescription('List all available placeholder groups')
        .addStringOption(PlaceholderGroupOption.addOptionHandler),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName(PlaceholderConstants.LIST_PLACEHOLDERS_SUBCOMMAND_NAME)
        .setDescription('List all available placeholders')
        .addStringOption(PlaceholderOption.addOptionHandler),
    );

export const placeholderInfoSubcommand = new SlashCommandSubcommandBuilder()
  .setName(PlaceholderConstants.PLACEHOLDER_INFO_SUBCOMMAND_NAME)
  .setDescription('Display information about placeholders');
