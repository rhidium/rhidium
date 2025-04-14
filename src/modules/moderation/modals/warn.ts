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
import { InputUtils, StringUtils } from '@core/utils';
import { Command, CommandType } from '@core/commands';
import { Embeds } from '@core/config';
import { Severity } from '@prisma/client';
import { severityValues } from '@core/database';

export enum WarnInteractions {
  WARN_MODAL_ID = 'warn-modal',
  WARN_REASON_INPUT_ID = 'warn-reason',
  WARN_SEVERITY_INPUT_ID = 'warn-severity',
  WARN_VALID_FOR_INPUT_ID = 'warn-valid-for',
}

export const warnModal = (user: User | null) => {
  if (user === null) {
    return new ModalBuilder()
      .setTitle('Warn')
      .setCustomId(WarnInteractions.WARN_MODAL_ID)
      .setComponents([
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId(WarnInteractions.WARN_REASON_INPUT_ID)
            .setStyle(TextInputStyle.Paragraph)
            .setLabel('Reason')
            .setPlaceholder('The reason why you are warning this user.')
            .setMinLength(5)
            .setMaxLength(200)
            .setRequired(true),
        ]),
        ModerationInputServices.severityTextInput(),
        InputUtils.Duration.durationTextInput({
          customId: WarnInteractions.WARN_VALID_FOR_INPUT_ID,
          label: 'Valid For',
          placeholder:
            'How long this warning counts towards the auto-moderation thresholds.',
          required: false,
        }),
      ]);
  }

  const safeDisplayName = StringUtils.truncate(user.displayName, 20);

  return new ModalBuilder()
    .setTitle(`Warn ${safeDisplayName}`)
    .setCustomId(`${WarnInteractions.WARN_MODAL_ID}@${user.id}`)
    .setComponents([
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([
        new TextInputBuilder()
          .setCustomId(WarnInteractions.WARN_REASON_INPUT_ID)
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
        customId: WarnInteractions.WARN_VALID_FOR_INPUT_ID,
        label: 'Valid For',
        placeholder:
          'How long this warning counts towards the auto-moderation thresholds.',
        required: false,
      }),
    ]);
};

const WarnModalCommand = new Command({
  type: CommandType.ModalSubmit,
  data: warnModal(null),
  enabled: {
    guildOnly: true,
  },
  interactions: {
    replyEphemeral: true,
    deferReply: true,
    refuseUncached: true,
  },
  run: async ({ interaction }) => {
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
      await WarnModalCommand.reply(interaction, {
        embeds: [
          Embeds.error(
            'The target user is no longer in the server, the warning cannot be issued.',
          ),
        ],
      });
      return;
    }

    // Resolve the interaction data
    const reason = fields.getField(WarnInteractions.WARN_REASON_INPUT_ID);
    const severity =
      fields.getField(WarnInteractions.WARN_SEVERITY_INPUT_ID) ?? Severity.LOW;
    const validFor = fields.getField(WarnInteractions.WARN_VALID_FOR_INPUT_ID);
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
      await WarnModalCommand.reply(interaction, {
        embeds: [
          Embeds.error(
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
