import { guildSettingsFromCache, updateGuildSettings } from '@client/database';
import { LoggingServices } from '@client/services';
import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { Lang, ChatInputCommand, InteractionUtils, PermLevel } from '@core';

const ModLogChannelCommand = new ChatInputCommand({
  permLevel: PermLevel.Administrator,
  isEphemeral: true,
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setDescription('Set the channel to send moderator log messages to')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel to send moderator log messages to')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addBooleanOption((option) =>
      option
        .setName('disable')
        .setDescription('Disable moderator log messages')
        .setRequired(false),
    ),
  run: async (client, interaction) => {
    const { options } = interaction;
    const channel = options.getChannel('channel');
    const disable = options.getBoolean('disable') ?? false;

    const guildAvailable = InteractionUtils.requireAvailableGuild(
      client,
      interaction,
    );
    if (!guildAvailable) return;

    await ModLogChannelCommand.deferReplyInternal(interaction);

    const guildSettings = await guildSettingsFromCache(interaction.guildId);
    if (!guildSettings) {
      await ModLogChannelCommand.reply(
        interaction,
        client.embeds.error(Lang.t('general:settings.notFound')),
      );
      return;
    }

    if (disable) {
      guildSettings.modLogChannelId = null;
      await updateGuildSettings(guildSettings, {
        data: { modLogChannelId: null },
      });
      await ModLogChannelCommand.reply(
        interaction,
        client.embeds.success(Lang.t('commands:mod-log-channel.disabled')),
      );
      void LoggingServices.adminLog(
        interaction.guild,
        client.embeds.info({
          title: Lang.t('commands:mod-log-channel.disabled'),
          description: Lang.t('commands:mod-log-channel.disabledBy', {
            username: interaction.user.username,
          }),
        }),
      );
      return;
    }

    if (!channel) {
      await ModLogChannelCommand.reply(
        interaction,
        client.embeds.branding({
          fields: [
            {
              name: Lang.t('commands:mod-log-channel.title'),
              value: guildSettings.modLogChannelId
                ? `<#${guildSettings.modLogChannelId}>`
                : Lang.t('general:notSet'),
            },
          ],
        }),
      );
      return;
    }

    guildSettings.modLogChannelId = channel.id;
    await updateGuildSettings(guildSettings, {
      data: { modLogChannelId: channel.id },
    });
    await ModLogChannelCommand.reply(
      interaction,
      client.embeds.success(
        Lang.t('commands:mod-log-channel.changed', {
          channel: channel.toString(),
        }),
      ),
    );
    void LoggingServices.adminLog(
      interaction.guild,
      client.embeds.info({
        title: Lang.t('commands:mod-log-channel.changedTitle'),
        fields: [
          {
            name: Lang.t('general:channel'),
            value: `<#${channel.id}>`,
            inline: true,
          },
          {
            name: Lang.t('general:member'),
            value: interaction.user.toString(),
            inline: true,
          },
        ],
      }),
    );
    return;
  },
});

export default ModLogChannelCommand;
