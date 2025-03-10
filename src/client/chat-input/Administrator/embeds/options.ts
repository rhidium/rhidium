import {
  SlashCommandIntegerOption,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from 'discord.js';
import {
  AvailableEmbedConfiguration,
  EmbedConfigurationConstants,
} from './enums';
import { maxFieldNameLength } from './helpers';
import { EmbedConstants } from '@rhidium/core';
import { Lang } from 'lib/i18n';

export const embedOptions = [
  {
    name: Lang.t('commands:embeds.embedOptions.memberJoin'),
    value: AvailableEmbedConfiguration.MEMBER_JOIN,
  },
  {
    name: Lang.t('commands:embeds.embedOptions.memberLeave'),
    value: AvailableEmbedConfiguration.MEMBER_LEAVE,
  },
];
export const embedCommandOption = new SlashCommandIntegerOption()
  .setName(EmbedConfigurationConstants.EMBED_COMMAND_OPTION_NAME)
  .setDescription('The embed to configure')
  .setRequired(true)
  .addChoices(...embedOptions);

export const staticConfigureEmbedOptions = [
  new SlashCommandStringOption()
    .setName('message')
    .setDescription(
      'Text to send with the embed, can ping users & roles (suppressed in embeds)',
    )
    .setRequired(false),
  new SlashCommandStringOption()
    .setName('color')
    .setDescription('The color of the embed')
    .setRequired(false),
  new SlashCommandStringOption()
    .setName('author-name')
    .setDescription('The name of the embed author')
    .setRequired(false),
  new SlashCommandStringOption()
    .setName('author-icon-url')
    .setDescription('The icon url of the embed author')
    .setRequired(false),
  new SlashCommandStringOption()
    .setName('author-url')
    .setDescription('The url of the embed author')
    .setRequired(false),
  new SlashCommandStringOption()
    .setName('title')
    .setDescription('The title of the embed')
    .setRequired(false),
  new SlashCommandStringOption()
    .setName('description')
    .setDescription('The description of the embed')
    .setRequired(false),
  new SlashCommandStringOption()
    .setName('url')
    .setDescription('The url of the embed')
    .setRequired(false),
  new SlashCommandStringOption()
    .setName('image-url')
    .setDescription('The image url of the embed')
    .setRequired(false),
  new SlashCommandStringOption()
    .setName('thumbnail-url')
    .setDescription('The thumbnail url of the embed')
    .setRequired(false),
  new SlashCommandStringOption()
    .setName('footer-text')
    .setDescription('The footer text of the embed')
    .setRequired(false),
  new SlashCommandStringOption()
    .setName('footer-icon-url')
    .setDescription('The footer icon url of the embed')
    .setRequired(false),
];
export const configureEmbedOptions = [
  ...staticConfigureEmbedOptions,
  ...Array.from(
    {
      length:
        EmbedConstants.MAX_FIELDS_LENGTH -
        staticConfigureEmbedOptions.length -
        1,
    },
    (_, i) => {
      const index = i + 1;
      const minPossibleLength = 3;
      const commaLength = 2;
      const minInlineLength = 4;
      return new SlashCommandStringOption()
        .setName(`field-${index}`)
        .setDescription(
          `The field ${index} of the embed, \`name;value;inline\` format`,
        )
        .setRequired(false)
        .setMinLength(minPossibleLength)
        .setMaxLength(
          maxFieldNameLength +
            EmbedConstants.FIELD_VALUE_MAX_LENGTH +
            commaLength +
            minInlineLength,
        );
    },
  ),
];

export const manageEmbedFieldsSubcommandGroup =
  new SlashCommandSubcommandGroupBuilder()
    .setName(EmbedConfigurationConstants.MANAGE_FIELDS_SUBCOMMAND_NAME)
    .setDescription('Manage the fields of the embed')
    .addSubcommand((subcommand) =>
      subcommand
        .setName(EmbedConfigurationConstants.MANAGE_FIELDS_ADD)
        .setDescription('Add a field to the embed')
        .addIntegerOption(embedCommandOption)
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('The name of this field')
            .setRequired(true)
            .setMaxLength(maxFieldNameLength),
        )
        .addStringOption((option) =>
          option
            .setName('value')
            .setDescription('The value of this field')
            .setRequired(true)
            .setMaxLength(EmbedConstants.FIELD_VALUE_MAX_LENGTH),
        )
        .addBooleanOption((option) =>
          option
            .setName('inline')
            .setDescription('Whether this field should be inline')
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName(EmbedConfigurationConstants.MANAGE_FIELDS_REMOVE)
        .setDescription('Remove a field from the embed')
        .addIntegerOption(embedCommandOption)
        .addIntegerOption((option) =>
          option
            .setName('index')
            .setDescription('The index of the field to remove')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .addIntegerOption(embedCommandOption)
        .setName(EmbedConfigurationConstants.MANAGE_FIELDS_LIST)
        .setDescription('List the fields of the embed'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .addIntegerOption(embedCommandOption)
        .setName(EmbedConfigurationConstants.MANAGE_FIELDS_RESET)
        .setDescription('Reset the fields of the embed')
        .addBooleanOption((option) =>
          option
            .setName('confirm')
            .setDescription('Whether to confirm the reset')
            .setRequired(false),
        ),
    );

export const showEmbedSubcommand = new SlashCommandSubcommandBuilder()
  .setName(EmbedConfigurationConstants.SHOW_SUBCOMMAND_NAME)
  .setDescription('Display/render the embed')
  .addIntegerOption(embedCommandOption);
