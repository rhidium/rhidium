import {
  ChatInputCommand,
  Database,
  InteractionUtils,
  PermissionUtils,
  PermLevel,
  Prisma,
} from '@core';
import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { ModLogServices } from '../../../moderation/services/mod-log';
import { LoggingServices } from '../../services';

const ModerationLoggingCommand = new ChatInputCommand({
  permLevel: PermLevel.Administrator,
  isEphemeral: true,
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName('moderation-logging')
    .setDescription('Configure the moderation logging channel.')
    .addBooleanOption((option) =>
      option
        .setName('enable')
        .setDescription(
          'Enable or disable sending moderation logs to a channel.',
        )
        .setRequired(false),
    )
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel to send moderation logs to.')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText),
    ),
  run: async (client, interaction) => {
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) return;

    const { options, guild: discordGuild } = interaction;
    const enable = options.getBoolean('enable', false);
    const channel = options.getChannel('channel', false, [
      ChannelType.GuildText,
    ]);

    const [guild] = await Promise.all([
      Database.Guild.resolve(discordGuild.id),
      interaction.deferReply(),
    ]);

    if (enable === null && channel === null) {
      await interaction.editReply({
        embeds: [
          client.embeds.info(
            `Moderation logging is currently ${
              guild.useModLogChannel ? 'enabled' : 'disabled'
            }${
              guild.useModLogChannel && guild.modLogChannelId
                ? ` and set to <#${guild.modLogChannelId}>`
                : ', but no channel is configured'
            }.`,
          ),
        ],
      });
      return;
    }

    const updateArgs: Prisma.GuildUpdateArgs = {
      where: { id: guild.id },
      data: {},
    };

    if (channel) {
      const permissions = ModLogServices.checkPermissions(channel);
      if (permissions !== true) {
        await interaction.editReply({
          embeds: [
            client.embeds.error(
              [
                `I am missing the following permissions in ${channel.toString()} (your selected channel):`,
                PermissionUtils.displayPermissions(permissions),
              ].join('\n'),
            ),
          ],
        });
        return;
      }

      updateArgs.data.modLogChannelId = channel.id;
    }

    if (typeof enable === 'boolean') {
      updateArgs.data.useModLogChannel = enable;
    }

    await Database.Guild.update(updateArgs);

    const output = `Moderation logging channel has been ${
      enable ? 'enabled' : 'disabled'
    }${enable && channel ? ` and set to ${channel.toString()}` : ''}.`;

    await Promise.all([
      interaction.editReply({
        embeds: [client.embeds.success(output)],
      }),
      LoggingServices.adminLog(
        discordGuild,
        client.embeds.info({
          title: 'Moderation Logging Channel',
          description: output,
          fields: [
            {
              name: 'Administrator',
              value: interaction.user.toString(),
              inline: true,
            },
          ],
        }),
      ),
    ]);
  },
});

export default ModerationLoggingCommand;
