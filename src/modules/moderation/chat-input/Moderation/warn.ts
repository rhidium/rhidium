import { Severity } from '@prisma/client';
import {
  ChatInputCommand,
  InputUtils,
  InteractionUtils,
  PermLevel,
} from '@core';
import { SlashCommandBuilder } from 'discord.js';
import { WarnServices } from '../../services/warn';
import { ModerationInputServices } from '../../services/input';

const WarnCommand = new ChatInputCommand({
  guildOnly: true,
  permLevel: PermLevel.Moderator,
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription(
      'Warn a user, automatically triggering moderation actions on specific thresholds.',
    )
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to warn')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription(
          'The reason for this warning, what did the user do? They will be notified of this reason.',
        )
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(200),
    )
    .addStringOption((option) =>
      ModerationInputServices.addSeverityOptionHandler(option),
    )
    .addStringOption((option) =>
      InputUtils.Duration.addOptionHandler(option, {
        name: 'valid-for',
        description:
          'How long this warning counts towards the auto-moderation thresholds.',
        required: false,
      }),
    ),
  run: async (client, interaction) => {
    // Prevent DM interaction, uncached guilds, etc.
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) return;

    // Resolve the interaction data
    const { options, member: issuerMember, guild: discordGuild } = interaction;
    const targetUser = options.getUser('user', true);
    const reason = options.getString('reason', true);
    const severity = options.getString('severity', true) as Severity;
    const validFor = options.getString('valid-for', false);
    const validUntil =
      validFor === null
        ? null
        : new Date(
            interaction.createdAt.valueOf() +
              InputUtils.Duration.inputToMs(validFor),
          );

    // Handle the warn interaction, reusable across different command types
    await WarnServices.handleWarnInteraction({
      client,
      interaction,
      targetUser,
      issuerMember,
      discordGuild,
      reason,
      severity,
      validUntil,
    });
  },
});

export default WarnCommand;
