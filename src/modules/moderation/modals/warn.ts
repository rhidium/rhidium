import {
  InputUtils,
  InteractionConstants,
  InteractionUtils,
  ModalCommand,
  Severity,
  severityValues,
  StringUtils,
} from '@core';
import {
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  User,
} from 'discord.js';
import { ModerationInputServices } from '../services/input';
import { WarnServices } from '../services/warn';

export const warnModal = (user: User) => {
  const safeDisplayName = StringUtils.truncate(user.displayName, 20);

  return new ModalBuilder()
    .setTitle(`Warn ${safeDisplayName}`)
    .setCustomId(`${InteractionConstants.WARN_MODAL_ID}@${user.id}`)
    .setComponents([
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([
        new TextInputBuilder()
          .setCustomId(InteractionConstants.WARN_REASON_INPUT_ID)
          .setStyle(TextInputStyle.Paragraph)
          .setLabel('Reason')
          .setPlaceholder(
            `The reason why you're warning ${safeDisplayName}. They will be notified of this reason.`,
          )
          .setMinLength(5)
          .setMaxLength(200)
          .setRequired(true),
      ]),
      ModerationInputServices.severityTextInput(),
      InputUtils.Duration.durationTextInput({
        customId: InteractionConstants.WARN_VALID_FOR_INPUT_ID,
        label: 'Valid For',
        placeholder:
          'How long this warning counts towards the auto-moderation thresholds.',
        required: false,
      }),
    ]);
};

const WarnModalCommand = new ModalCommand({
  customId: InteractionConstants.WARN_MODAL_ID,
  run: async (client, interaction) => {
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) return;

    const {
      member: issuerMember,
      fields,
      guild: discordGuild,
      customId,
    } = interaction;

    const [, targetUserId] = customId.split('@');
    const targetMember = targetUserId
      ? await discordGuild.members.fetch(targetUserId).catch(() => null)
      : null;

    if (!targetMember) {
      await InteractionUtils.replyDynamic(interaction, {
        embeds: [
          client.embeds.error(
            'The target user is no longer in the server, the warning cannot be issued.',
          ),
        ],
      });
      return;
    }

    // Resolve the interaction data
    const reason = fields.getField(InteractionConstants.WARN_REASON_INPUT_ID);
    const severity =
      fields.getField(InteractionConstants.WARN_SEVERITY_INPUT_ID) ??
      Severity.LOW;
    const validFor = fields.getField(
      InteractionConstants.WARN_VALID_FOR_INPUT_ID,
    );
    const validUntil =
      validFor === null
        ? null
        : new Date(
            interaction.createdAt.valueOf() +
              InputUtils.Duration.inputToMs(validFor.value),
          );

    if (
      !severityValues
        .map((s) => s.toLowerCase())
        .includes(severity.value.toLowerCase())
    ) {
      await InteractionUtils.replyDynamic(interaction, {
        embeds: [
          client.embeds.error(
            `Invalid severity, please choose from: ${ModerationInputServices.displaySeverity}`,
          ),
        ],
      });
      return;
    }

    const resolvedSeverity = severityValues.find(
      (s) => s.toLowerCase() === severity.value.toLowerCase(),
    ) as Severity;

    // Handle the warn interaction, reusable across different command types
    await WarnServices.handleWarnInteraction({
      client,
      interaction,
      targetUser: targetMember.user,
      issuerMember,
      discordGuild,
      reason: reason.value,
      severity: resolvedSeverity,
      validUntil,
    });
  },
});

export default WarnModalCommand;
