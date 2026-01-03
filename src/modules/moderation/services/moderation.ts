import { Permissions } from '@core/commands';
import { UnitConstants } from '@core/constants';
import {
  type PopulatedAutoModerationAction,
  type PopulatedWarning,
} from '@core/database';
import { ChannelUtils, type DeleteMessagesResult, TimeUtils } from '@core/utils';
import {
  ModerationAction,
  type Prisma,
  type PrismaClient,
  type Severity,
  type SeverityConfiguration,
} from '@prisma/client';
import { GuildMember, PermissionFlagsBits } from 'discord.js';

export class ModerationServices {
  static readonly defaultSeverityConfiguration = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
  };

  static readonly stringifyAutoModerationAction = (
    action: PopulatedAutoModerationAction,
  ): string => {
    const triggerThreshold = action.triggerThreshold.toLocaleString();
    const thresholdStr = action.oncePerMember
      ? `${triggerThreshold} warnings`
      : `every ${triggerThreshold} warnings`;
    const actionDurationStr = action.actionDurationMs
      ? ` for ${TimeUtils.humanReadableMs(action.actionDurationMs)}`
      : '';
    const deleteMessagesStr =
      typeof action.deleteMessageSeconds === 'number' &&
      action.deleteMessageSeconds > 0
        ? ` (messages going back ${TimeUtils.humanReadableMs(
            action.deleteMessageSeconds * UnitConstants.MS_IN_ONE_SECOND,
          )} will be deleted)`
        : '';

    return `${thresholdStr} - **\`${action.action}\`**${actionDurationStr}${deleteMessagesStr}`;
  };

  static readonly relativeAutoModerationActions = (
    date: Date,
    actions: PopulatedAutoModerationAction[],
  ) => {
    return actions.map(
      (action) =>
        `**\`${action.action}\`** ${
          action.actionDurationMs
            ? `until ${TimeUtils.discordInfoTimestamp(date.valueOf() + action.actionDurationMs)}`
            : ''
        }`,
    );
  };

  static readonly verbResolver = (
    action: ModerationAction,
    pastTense = true,
  ): string => {
    switch (action) {
      case ModerationAction.KICK:
        return pastTense ? 'kicked' : 'kick';
      case ModerationAction.BAN_DURATION:
        return pastTense ? 'temp-banned' : 'temp-ban';
      case ModerationAction.MUTE_DURATION:
        return pastTense ? 'temp-muted' : 'temp-mute';
      case ModerationAction.MUTE_PERMANENT:
        return pastTense ? 'muted' : 'mute';
      case ModerationAction.BAN_PERMANENT:
        return pastTense ? 'banned' : 'ban';
      default:
        throw new Error(`Unknown moderation action: ${action}`);
    }
  };

  static readonly caseNumberTransaction = async (
    tx: Omit<
      PrismaClient<Prisma.PrismaClientOptions, never>,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
    guildId: string,
  ) => {
    return await tx.guildCaseCounter
      .upsert({
        where: {
          GuildId: guildId,
        },
        create: {
          GuildId: guildId,
          caseNumber: 1,
        },
        update: {
          caseNumber: {
            increment: 1,
          },
        },
        select: {
          caseNumber: true,
        },
      })
      .then((result) => result.caseNumber);
  };

  static readonly getSeverityValue = (
    warnOrSeverity: Severity | PopulatedWarning,
    severityConfiguration: SeverityConfiguration | null,
  ): number => {
    const warning = typeof warnOrSeverity !== 'string' ? warnOrSeverity : null;
    const severity =
      typeof warnOrSeverity === 'string'
        ? warnOrSeverity
        : warnOrSeverity.severity;

    if (!severityConfiguration) {
      return this.defaultSeverityConfiguration[severity];
    }

    if (warning?.validUntil && warning.validUntil.valueOf() < Date.now()) {
      return 0;
    }

    return severityConfiguration[severity];
  };

  static readonly applyAutoModerationActions = async (
    discordTarget: GuildMember,
    actions: PopulatedAutoModerationAction[],
    reason: string,
    onAction?: (action: PopulatedAutoModerationAction) => void,
    onFinishDeleteMessages?: (deletedMessages: DeleteMessagesResult) => void,
  ): Promise<string[]> => {
    let failedDm = false;
    const output: string[] = [];

    for await (const action of actions) {
      const messagePrefix = `Auto-moderation action: ${action.triggerThreshold} warnings.`;
      const resolvedMessage =
        messagePrefix + (reason ? ` Reason: ${reason}` : '');

      try {
        await discordTarget.send(
          `You have been automatically ${this.verbResolver(
            action.action,
          )} from **${discordTarget.guild.name}**.\n\nReason: ${messagePrefix}\nMessage: ${reason}`,
        );
      } catch (error) {
        if (!failedDm) {
          output.push(`Failed to send message to user (DM): ${error}`);
        }
        failedDm = true;
      }

      switch (action.action) {
        case ModerationAction.KICK:
        case ModerationAction.BAN_DURATION: {
          // Please note BAN_DURATION kicks the members, and keeps
          // kicking them (if they rejoin) until the duration is over
          try {
            await discordTarget.kick(resolvedMessage);
            output.push(
              `Successfully ${this.verbResolver(action.action)} the user.`,
            );
          } catch (error) {
            output.push(
              `Failed to ${this.verbResolver(action.action, false)} the user: ${error}`,
            );
          }
          break;
        }
        case ModerationAction.MUTE_DURATION:
        case ModerationAction.MUTE_PERMANENT: {
          try {
            const durationMs =
              typeof action.actionDurationMs === 'number' &&
              action.actionDurationMs > 0
                ? action.actionDurationMs
                : 0;
            await discordTarget.timeout(durationMs, resolvedMessage);
            output.push(
              `Successfully timed the user out for ${TimeUtils.humanReadableMs(durationMs)}.`,
            );
          } catch (error) {
            output.push(`Failed to time the user out: ${error}`);
          }
          break;
        }
        case ModerationAction.BAN_PERMANENT: {
          try {
            await discordTarget.ban({
              reason: resolvedMessage,
            });
            output.push('Successfully banned the user.');
          } catch (error) {
            output.push(`Failed to ban the user: ${error}`);
          }
          break;
        }
        default: {
          throw new Error(`Unknown (auto-)moderation action: ${action.action}`);
        }
      }

      if (onAction) {
        onAction(action);
      }
    }

    const highestDeleteMessageSeconds = actions.reduce((acc, action) => {
      if (
        typeof action.deleteMessageSeconds !== 'number' ||
        action.deleteMessageSeconds <= 0 ||
        action.deleteMessageSeconds > UnitConstants.SECONDS_IN_ONE_WEEK
      ) {
        return acc;
      }

      return action.deleteMessageSeconds
        ? Math.max(acc, action.deleteMessageSeconds)
        : acc;
    }, 0);

    if (highestDeleteMessageSeconds > 0) {
      // Note: This can take a long time, and we don't need to wait for it.
      void ModerationServices.deleteMemberMessages(
        discordTarget,
        highestDeleteMessageSeconds,
      ).then((result) => {
        if (onFinishDeleteMessages) {
          onFinishDeleteMessages(result);
        }
      });
    }

    return output;
  };

  static readonly deleteMemberMessages = async (
    discordTarget: GuildMember,
    goBackSeconds: number,
  ): Promise<DeleteMessagesResult> => {
    const targetId = discordTarget.user.id;
    const clientId = discordTarget.guild.client.user.id;
    const requiredPermissions = [PermissionFlagsBits.ManageMessages];
    const ts = Date.now() - goBackSeconds * UnitConstants.MS_IN_ONE_SECOND;
    const twoWeeksAgo = Date.now() - UnitConstants.MS_IN_ONE_DAY * 14;

    const messageLists = await ChannelUtils.fetchMessages(
      discordTarget.guild,
      (channel) =>
        Permissions.hasChannelPermissions(
          clientId,
          channel,
          requiredPermissions,
        ) === true,
      (message) =>
        message.author.id === targetId &&
        message.createdTimestamp >= ts &&
        message.createdTimestamp >= twoWeeksAgo,
      (_channel, lastMessage, messageList) =>
        lastMessage.createdTimestamp >= ts &&
        lastMessage.createdTimestamp >= twoWeeksAgo &&
        // Note: Let's escape early if the entire chunk is bot messages
        !messageList.every((m) => m.author.bot),
    );

    return ChannelUtils.deleteMessages(discordTarget.guild, messageLists);
  };
}
