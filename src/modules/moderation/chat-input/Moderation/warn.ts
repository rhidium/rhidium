import { Severity } from '@prisma/client';
import {
  ChatInputCommand,
  InputUtils,
  InteractionUtils,
  isAutoCompleteResponseType,
  PermLevel,
} from '@core';
import { SlashCommandBuilder } from 'discord.js';
import { WarnServices } from '../../services/warn';
import { ModerationInputServices } from '../../services/input';
import WarningOption from '../../auto-completes/warning';

const WarnCommand = new ChatInputCommand({
  guildOnly: true,
  permLevel: PermLevel.Moderator,
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Manage warnings for a user.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
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
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a warning from a user.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to remove the warning from')
            .setRequired(true),
        )
        .addStringOption((option) => WarningOption.addOptionHandler(option))
        .addBooleanOption((option) =>
          option
            .setName('delete')
            .setDescription(
              'Should the warning be deleted entirely, or no longer count towards the auto-moderation thresholds?',
            )
            .setRequired(false),
        ),
    ),
  run: async (client, interaction) => {
    // Prevent DM interaction, uncached guilds, etc.
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) return;

    // Resolve the interaction data
    const { options, member: issuerMember, guild: discordGuild } = interaction;
    const subcommand = options.getSubcommand(true);

    // Handle warn creation
    if (subcommand === 'create') {
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
    }

    // Handle warn removal
    if (subcommand === 'remove') {
      const targetUser = options.getUser('user', true);
      const warning = await WarningOption.getValue(interaction, true);
      const deleteWarning = options.getBoolean('delete', false) ?? false;

      // Function handled the response
      if (isAutoCompleteResponseType(warning)) {
        return;
      }

      // Handle the warn removal interaction
      await WarnServices.handleWarnRemovalInteraction({
        client,
        interaction,
        targetUser,
        issuerMember,
        discordGuild,
        warningId: warning.id,
        deleteWarning,
      });
    }
  },
});

export default WarnCommand;
