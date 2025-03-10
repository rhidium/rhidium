import { SlashCommandBuilder } from 'discord.js';
import {
  manageEmbedFieldsSubcommandGroup,
  showEmbedSubcommand,
} from './options';
import { configureEmbedSubcommand } from './components';
import { embedFromEmbedModel, settingsKeyFromEmbedOption } from './helpers';
import {
  configureEmbedController,
  manageEmbedFieldsController,
} from './controllers';
import { EmbedConfigurationConstants } from './enums';
import { ChatInputCommand, InteractionUtils, PermLevel } from '@rhidium/core';
import { guildSettingsFromCache } from '@/database';
import { Lang } from 'lib/i18n';

const ConfigureEmbedsCommand = new ChatInputCommand({
  permLevel: PermLevel.Administrator,
  guildOnly: true,
  data: new SlashCommandBuilder()
    .addSubcommand(showEmbedSubcommand)
    .addSubcommand(configureEmbedSubcommand())
    .addSubcommandGroup(manageEmbedFieldsSubcommandGroup),
  run: async (client, interaction) => {
    const { options } = interaction;
    const subcommand = options.getSubcommand(true);
    const subcommandGroup = options.getSubcommandGroup(false);
    const embedOptionInput = options.getInteger(
      EmbedConfigurationConstants.EMBED_COMMAND_OPTION_NAME,
      true,
    );

    const guildAvailable = InteractionUtils.requireAvailableGuild(
      client,
      interaction,
    );
    if (!guildAvailable) return;

    await ConfigureEmbedsCommand.deferReplyInternal(interaction);

    const guildSettings = await guildSettingsFromCache(interaction.guild.id);
    if (!guildSettings) {
      await ConfigureEmbedsCommand.reply(
        interaction,
        client.embeds.error(Lang.t('general:settings.notFound')),
      );
      return;
    }

    const settingKey = settingsKeyFromEmbedOption(embedOptionInput);
    const setting = guildSettings[settingKey];

    if (subcommandGroup) {
      switch (subcommandGroup) {
        case EmbedConfigurationConstants.MANAGE_FIELDS_SUBCOMMAND_NAME:
        default: {
          manageEmbedFieldsController(
            client,
            interaction,
            guildSettings,
            setting,
          );
          break;
        }
      }
      return;
    }

    switch (subcommand) {
      case EmbedConfigurationConstants.CONFIGURE_SUBCOMMAND_NAME: {
        configureEmbedController(client, interaction, guildSettings);
        break;
      }

      case EmbedConfigurationConstants.SHOW_SUBCOMMAND_NAME:
      default: {
        const embed = embedFromEmbedModel(setting);
        await ConfigureEmbedsCommand.reply(interaction, { embeds: [embed] });
        break;
      }
    }
  },
});

export default ConfigureEmbedsCommand;
