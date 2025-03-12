import { guildSettingsFromCache, updateGuildSettings } from '@client/database';
import { LoggingServices } from '@client/services';
import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { Lang, ChatInputCommand, InteractionUtils, PermLevel } from '@core';

const MemberJoinChannelCommand = new ChatInputCommand({
  permLevel: PermLevel.Administrator,
  isEphemeral: true,
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setDescription('Set the channel to send member join messages to')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel to send member join messages to')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addBooleanOption((option) =>
      option
        .setName('disable')
        .setDescription('Disable member join messages')
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

    await MemberJoinChannelCommand.deferReplyInternal(interaction);

    const guildSettings = await guildSettingsFromCache(interaction.guildId);
    if (!guildSettings) {
      await MemberJoinChannelCommand.reply(
        interaction,
        client.embeds.error(Lang.t('general:settings.notFound')),
      );
      return;
    }

    if (disable) {
      guildSettings.memberJoinChannelId = null;
      await updateGuildSettings(guildSettings, {
        data: { memberJoinChannelId: null },
      });
      await MemberJoinChannelCommand.reply(
        interaction,
        client.embeds.success(Lang.t('commands:member-join-channel.disabled')),
      );
      void LoggingServices.adminLog(
        interaction.guild,
        client.embeds.info({
          title: Lang.t('commands:member-join-channel.disabledTitle'),
          description: Lang.t('commands:member-join-channel.disabledBy', {
            username: interaction.user.username,
          }),
        }),
      );
      return;
    }

    if (!channel) {
      await MemberJoinChannelCommand.reply(
        interaction,
        client.embeds.branding({
          fields: [
            {
              name: Lang.t('commands:member-join-channel.title'),
              value: guildSettings.memberJoinChannelId
                ? `<#${guildSettings.memberJoinChannelId}>`
                : Lang.t('general:notSet'),
            },
          ],
        }),
      );
      return;
    }

    guildSettings.memberJoinChannelId = channel.id;
    await updateGuildSettings(guildSettings, {
      data: { memberJoinChannelId: channel.id },
    });
    await MemberJoinChannelCommand.reply(
      interaction,
      client.embeds.success(
        Lang.t('commands:member-join-channel.changed', {
          channel: channel.toString(),
        }),
      ),
    );
    void LoggingServices.adminLog(
      interaction.guild,
      client.embeds.info({
        title: Lang.t('commands:member-join-channel.changedTitle'),
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

export default MemberJoinChannelCommand;
