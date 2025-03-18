import {
  ChatInputCommand,
  Database,
  InputUtils,
  InteractionUtils,
  PermLevel,
  PopulatedGuild,
  prismaClient,
} from '@core';
import { SlashCommandBuilder } from 'discord.js';
import { ModerationServices } from '../../../moderation/services/moderation';

const ResetSettingsCommand = new ChatInputCommand({
  guildOnly: true,
  permLevel: PermLevel['Server Owner'],
  data: new SlashCommandBuilder()
    .setName('reset-settings')
    .setDescription('Reset all server settings to their default values.')
    .addBooleanOption((option) =>
      option
        .setName('delete-all-data')
        .setDescription(
          'Reset/delete all server data, including warnings, member data, and auto-moderation actions.',
        )
        .setRequired(false),
    ),
  run: async (client, interaction) => {
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) return;

    const fullReset =
      interaction.options.getBoolean('delete-all-data') ?? false;

    const resetGuildSettings = async (guildId: string) => {
      await Database.Guild.update({
        where: { id: guildId },
        data: {
          adminLogChannelId: null,
          modLogChannelId: null,
          useModLogChannel: true,
          adminRoleId: null,
          modRoleId: null,
          autoRoleIds: {
            set: [],
          },
          memberJoinChannelId: null,
          memberLeaveChannelId: null,
          SeverityConfiguration: {
            update: {
              LOW: ModerationServices.defaultSeverityConfiguration.LOW,
              MEDIUM: ModerationServices.defaultSeverityConfiguration.MEDIUM,
              HIGH: ModerationServices.defaultSeverityConfiguration.HIGH,
            },
          },
        },
      });
    };

    const performFullReset = async (guild: PopulatedGuild) => {
      await prismaClient.warning.deleteMany({
        where: {
          OR: [
            { MemberGuildId: interaction.guildId },
            { IssuedByGuildId: interaction.guildId },
          ],
        },
      });
      await Database.Guild.update({
        where: { id: interaction.guildId },
        data: {
          SeverityConfiguration: guild.SeverityConfiguration
            ? {
                delete: {
                  GuildId: interaction.guildId,
                },
              }
            : {},
          AutoModerationActions: guild.AutoModerationActions.length
            ? {
                deleteMany: {
                  GuildId: interaction.guildId,
                },
              }
            : {},
          Members: {
            deleteMany: {
              GuildId: interaction.guildId,
            },
          },
        },
      });
      await Database.Guild.delete({ id: interaction.guildId });
    };

    const actionText = fullReset
      ? 'reset and delete all server data'
      : 'reset all server settings';

    await InputUtils.Confirmation.promptConfirmation({
      client,
      interaction,
      content: {
        embeds: [
          client.embeds.warning(
            `Are you sure you want to ${actionText}? This action cannot be undone.`,
          ),
        ],
      },
      onConfirm: async (i) => {
        const [guild] = await Promise.all([
          // Note: Make sure the guild data exists before running delete queries
          Database.Guild.resolve(interaction.guildId),
          i.deferUpdate(),
        ]);

        try {
          if (fullReset) {
            await performFullReset(guild);
          } else {
            await resetGuildSettings(interaction.guildId);
          }
        } catch (error) {
          client.logger.error(`Failed to ${actionText}: ${error}`);
          await i.editReply({
            content: '',
            components: [],
            embeds: [
              client.embeds.error(
                `Failed to ${actionText}, please try again later.`,
              ),
            ],
          });
          return;
        }

        await i.editReply({
          content: '',
          components: [],
          embeds: [client.embeds.success(`Successfully ${actionText}`)],
        });
      },
    });
  },
});

export default ResetSettingsCommand;
