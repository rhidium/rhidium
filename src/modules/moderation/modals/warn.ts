import { ModerationInputServices } from '../services/input';
import { WarnServices } from '../services/warn';
import { Severity } from '@prisma/client';
import { warnModal } from '../helpers';
import { WarnInteractions } from '../constants';
import { Command } from '@core/commands/base';
import { CommandType } from '@core/commands/types';
import { Embeds } from '@core/config/embeds';
import { InputUtils } from '@core/utils/inputs';
import { severityValues } from '@core/database/util';

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

    if (!('value' in validFor) || !('value' in severity) || !('value' in reason)) {
      await WarnModalCommand.reply(interaction, {
        embeds: [Embeds.error('Invalid modal submission data. Please note that Rhidium currently ONLY support text-based inputs (TextInputBuilder).')],
      });
      return;
    }

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
