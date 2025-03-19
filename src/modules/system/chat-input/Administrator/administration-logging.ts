import { ChannelType, SlashCommandBuilder } from 'discord.js';
import {
  Lang,
  ChatInputCommand,
  InteractionUtils,
  PermLevel,
  Database,
  AuditLogType,
} from '@core';

const AdministrationLoggingCommand = new ChatInputCommand({
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

    await AdministrationLoggingCommand.deferReplyInternal(interaction);

    const [guild, , user] =
      await Database.Guild.resolveFromInteraction(interaction);

    if (disable) {
      const updatedGuild = await Database.Guild.update({
        where: { id: interaction.guildId },
        data: { adminLogChannelId: null },
      });
      await AdministrationLoggingCommand.reply(
        interaction,
        client.embeds.success(Lang.t('commands:admin-log-channel.disabled')),
      );
      void Database.AuditLog.util({
        client,
        type: AuditLogType.AUDIT_LOG_CHANNEL_DISABLED,
        user,
        guild,
        data: { before: guild, after: updatedGuild },
      });
      return;
    }

    if (!channel) {
      await AdministrationLoggingCommand.reply(
        interaction,
        client.embeds.branding({
          fields: [
            {
              name: Lang.t('commands:admin-log-channel.title'),
              value: guild.adminLogChannelId
                ? `<#${guild.adminLogChannelId}>`
                : Lang.t('general:notSet'),
            },
          ],
        }),
      );
      return;
    }

    const updatedGuild = await Database.Guild.update({
      where: { id: interaction.guildId },
      data: { adminLogChannelId: channel.id },
    });
    await AdministrationLoggingCommand.reply(
      interaction,
      client.embeds.success(
        Lang.t('commands:admin-log-channel.changed', {
          channel: channel.toString(),
        }),
      ),
    );
    void Database.AuditLog.util({
      client,
      type: AuditLogType.AUDIT_LOG_CHANNEL_CHANGED,
      user,
      guild,
      data: { before: guild, after: updatedGuild },
    });
    return;
  },
});

export default AdministrationLoggingCommand;
