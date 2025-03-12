import { ButtonStyle, SlashCommandSubcommandBuilder } from 'discord.js';
import { configureEmbedOptions, embedCommandOption } from './options';
import { ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { EmbedConfigurationConstants } from './enums';
import { Lang } from '@core';

export const configureEmbedSubcommand = () => {
  const subcommand = new SlashCommandSubcommandBuilder()
    .setName(EmbedConfigurationConstants.CONFIGURE_SUBCOMMAND_NAME)
    .setDescription(
      'Configure an embed, use special value "none" to remove existing field/value',
    )
    .addIntegerOption(embedCommandOption);
  configureEmbedOptions.forEach((option) => subcommand.addStringOption(option));
  return subcommand;
};

export const configureEmbedControlRow =
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(EmbedConfigurationConstants.CONFIGURE_CONTINUE)
      .setLabel(Lang.t('general:continue'))
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(EmbedConfigurationConstants.CONFIGURE_CANCEL)
      .setLabel(Lang.t('general:cancel'))
      .setStyle(ButtonStyle.Secondary),
  );

export const configureEmbedAcceptedRow =
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(EmbedConfigurationConstants.CONFIGURE_CONTINUE)
      .setLabel(Lang.t('general:saved'))
      .setDisabled(true)
      .setStyle(ButtonStyle.Success),
  );
