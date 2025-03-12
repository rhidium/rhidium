import { guildSettingsFromCache, updateGuildSettings } from '@client/database';
import { LoggingServices } from '@client/services';
import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { Lang, ChatInputCommand, InteractionUtils, PermLevel } from '@core';

const AdminLogChannelCommand = new ChatInputCommand({
  permLevel: PermLevel.Administrator,
  isEphemeral: true,
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setDescription('Set the channel to send admin log (audit) messages to')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel to send admin log (audit) messages to')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addBooleanOption((option) =>
      option
        .setName('disable')
        .setDescription('Disable admin log messages')
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

    await AdminLogChannelCommand.deferReplyInternal(interaction);

    const guildSettings = await guildSettingsFromCache(interaction.guildId);
    if (!guildSettings) {
      await AdminLogChannelCommand.reply(
        interaction,
        client.embeds.error(Lang.t('general:settings.notFound')),
      );
      return;
    }

    if (disable) {
      guildSettings.adminLogChannelId = null;
      await updateGuildSettings(guildSettings, {
        data: { adminLogChannelId: null },
      });
      await AdminLogChannelCommand.reply(
        interaction,
        client.embeds.success(Lang.t('commands:admin-log-channel.disabled')),
      );
      void LoggingServices.adminLog(
        interaction.guild,
        client.embeds.info({
          title: Lang.t('commands:admin-log-channel.disabled'),
          description: Lang.t('commands:admin-log-channel.disabledBy', {
            username: interaction.user.username,
          }),
        }),
      );
      return;
    }

    if (!channel) {
      await AdminLogChannelCommand.reply(
        interaction,
        client.embeds.branding({
          fields: [
            {
              name: Lang.t('commands:admin-log-channel.title'),
              value: guildSettings.adminLogChannelId
                ? `<#${guildSettings.adminLogChannelId}>`
                : Lang.t('general:notSet'),
            },
          ],
        }),
      );
      return;
    }

    guildSettings.adminLogChannelId = channel.id;
    await updateGuildSettings(guildSettings, {
      data: { adminLogChannelId: channel.id },
    });
    await AdminLogChannelCommand.reply(
      interaction,
      client.embeds.success(
        Lang.t('commands:admin-log-channel.changed', {
          channel: channel.toString(),
        }),
      ),
    );
    void LoggingServices.adminLog(
      interaction.guild,
      client.embeds.info({
        title: Lang.t('commands:admin-log-channel.changedTitle'),
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

export default AdminLogChannelCommand;
