import {
  ChannelUtils,
  Client,
  Database,
  EmbedConstants,
  ModerationAction,
  PopulatedAutoModerationAction,
  PopulatedGuild,
  PopulatedMember,
  PopulatedPrisma,
  populateWarning,
  PopulatedWarning,
  Prisma,
  Severity,
  TimeUtils,
} from '@core';
import { ModerationServices } from './moderation';
import {
  AttachmentBuilder,
  Guild,
  GuildMember,
  RepliableInteraction,
  User,
} from 'discord.js';
import { ModerationPermissionServices } from './permission';
import { ModLogServices } from './mod-log';

class WarnServices {
  static readonly stringifyWarn = (warn: PopulatedWarning, format = true) =>
    format
      ? `**\`#${warn.caseNumber}\`** - ${warn.message}`
      : `#${warn.caseNumber} - ${warn.message}`;

  static readonly resolveWarns = (
    member: PopulatedMember,
    guild: PopulatedGuild,
    severity?: Severity,
  ) => {
    const warnsBefore = member.ReceivedWarnings.reduce((acc, warn) => {
      const value = ModerationServices.getSeverityValue(
        warn,
        guild.SeverityConfiguration,
      );
      if (typeof value !== 'number') return acc;
      return acc + value;
    }, 0);
    const warnsAfter = severity
      ? warnsBefore +
        ModerationServices.getSeverityValue(
          severity,
          guild.SeverityConfiguration,
        )
      : warnsBefore;
    const triggeredActions = guild.AutoModerationActions.sort(
      (a, b) => b.triggerThreshold - a.triggerThreshold,
    ).filter(
      (action) =>
        warnsAfter >= action.triggerThreshold &&
        (action.oncePerMember
          ? !action.ExecutedWarnings.some(
              (warn) => warn.MemberUserId === member.UserId,
            )
          : warnsAfter % action.triggerThreshold === 0),
    );

    // Reduce all triggered actions into 1 of each type/action
    const reducedActions = triggeredActions
      .sort((a, b) => b.triggerThreshold - a.triggerThreshold)
      .reduce(
        (acc, action) => {
          const curr = acc[action.action];
          if (!curr || curr.triggerThreshold < action.triggerThreshold) {
            acc[action.action] = action;
          } else {
            if (
              action.deleteMessageSeconds &&
              (!curr.deleteMessageSeconds ||
                curr.deleteMessageSeconds < action.deleteMessageSeconds)
            ) {
              curr.deleteMessageSeconds = action.deleteMessageSeconds;
            }
            if (
              action.actionDurationMs &&
              (!curr.actionDurationMs ||
                curr.actionDurationMs < action.actionDurationMs)
            ) {
              curr.actionDurationMs = action.actionDurationMs;
            }
          }
          return acc;
        },
        {
          [ModerationAction.KICK]: null,
          [ModerationAction.BAN_DURATION]: null,
          [ModerationAction.MUTE_DURATION]: null,
          [ModerationAction.MUTE_PERMANENT]: null,
          [ModerationAction.BAN_PERMANENT]: null,
        } as {
          [key in ModerationAction]: PopulatedAutoModerationAction | null;
        },
      );

    return {
      before: warnsBefore,
      after: warnsAfter,
      triggeredActions: Object.values(reducedActions).filter(
        (action) => action !== null,
      ),
    };
  };

  static readonly createWarn = async (
    guild: PopulatedGuild,
    member: PopulatedMember,
    data: Omit<Prisma.WarningCreateWithoutMemberInput, 'caseNumber'>,
  ): Promise<PopulatedWarning> => {
    return PopulatedPrisma.$transaction(async (tx) => {
      const caseNumber = await ModerationServices.caseNumberTransaction(
        tx,
        guild.id,
      );

      return await tx.warning.create({
        ...populateWarning,
        data: {
          ...data,
          caseNumber,
          Member: {
            connect: {
              id: member.id,
            },
          },
        },
      });
    });
  };

  static readonly warnMember = async (
    member: PopulatedMember,
    guild: PopulatedGuild,
    {
      date,
      message,
      severity,
      validUntil,
      issuedBy,
    }: {
      date: Date;
      message: string;
      severity: Severity;
      validUntil: Date | null;
      issuedBy: PopulatedMember;
    },
  ) => {
    const {
      before: warnsBefore,
      after: warnsAfter,
      triggeredActions,
    } = WarnServices.resolveWarns(member, guild, severity);

    const warning = await WarnServices.createWarn(guild, member, {
      date,
      message,
      severity,
      validUntil,
      TriggeredActions: {
        connect: triggeredActions.map((action) => ({
          id: action.id,
        })),
      },
      IssuedBy: {
        connect: {
          id: issuedBy.id,
        },
      },
    });

    // Note: Already connected, but updates the cache
    const updatedMember = await Database.Member.update({
      where: {
        id: member.id,
      },
      data: {
        ReceivedWarnings: {
          connect: {
            id: warning.id,
          },
        },
      },
    });

    return {
      warning,
      updatedMember,
      warnsBefore,
      warnsAfter,
      triggeredActions,
    };
  };

  static readonly handleWarnInteraction = async ({
    client,
    interaction,
    discordGuild,
    issuerMember,
    targetUser,
    reason,
    severity,
    validUntil,
  }: {
    client: Client;
    interaction: RepliableInteraction;
    discordGuild: Guild;
    issuerMember: GuildMember;
    targetUser: User;
    reason: string;
    severity: Severity;
    validUntil: Date | null;
  }) => {
    // Fetch the required data
    const [guild, issuer, target] = await Promise.all([
      Database.Guild.resolve(discordGuild.id),
      Database.Member.resolve({
        userId: issuerMember.id,
        guildId: discordGuild.id,
      }),
      Database.Member.resolve({
        userId: targetUser.id,
        guildId: discordGuild.id,
      }),
      interaction.deferReply(),
    ]);

    // Check if the issuer can moderate the target
    const moderationTarget =
      await ModerationPermissionServices.handleCanModerateTarget({
        client,
        interaction,
        targetUser,
        issuerMember,
        discordGuild,
        guild,
      });

    // Return if the target is not valid/moderatable
    if (moderationTarget === false) return;

    // Process the warning
    const {
      warning,
      warnsBefore,
      warnsAfter,
      triggeredActions,
      updatedMember: updatedTarget,
    } = await WarnServices.warnMember(target, guild, {
      date: interaction.createdAt,
      issuedBy: issuer,
      message: reason,
      severity,
      validUntil,
    });

    // Prepare the output/feedback
    const relativeActions = ModerationServices.relativeAutoModerationActions(
      interaction.createdAt,
      triggeredActions,
    );
    const validUntilOutput =
      validUntil !== null
        ? `Expires ${TimeUtils.discordInfoTimestamp(validUntil.valueOf())}`
        : 'Indefinite';
    const actionsOutput = relativeActions.length
      ? `This warn triggered the following auto-moderation action(s):\n- ${relativeActions.join(
          '\n- ',
        )}`
      : 'This warn did not trigger any auto-moderation actions.';
    const previousWarnOutput = updatedTarget.ReceivedWarnings.length
      ? `__This user has received a total of **${updatedTarget.ReceivedWarnings.length}** warnings:__` +
        `\n\n${updatedTarget.ReceivedWarnings.map((w) => `**\`${w.id}\`** - ${w.message}`).join('\n')}`
      : 'This user has not received any warnings before.';

    const includePreviousWarnsInOutput =
      updatedTarget.ReceivedWarnings.length > 0 &&
      updatedTarget.ReceivedWarnings.length < 5 &&
      previousWarnOutput.length < EmbedConstants.DESCRIPTION_MAX_LENGTH - 500;

    // User feedback
    await interaction.editReply({
      embeds: [
        client.embeds.success(
          [
            `Successfully warned **${targetUser.displayName}** with a severity of \`${severity}\`.`,
            validUntilOutput !== 'Indefinite'
              ? `This warning is valid until ${validUntilOutput.replace('Expires ', '')}.`
              : null,
            `This user now has **${warnsAfter} warns** (${warnsBefore} before)`,
            '\n\n',
            actionsOutput,
            (relativeActions.length
              ? '\nPlease wait while these actions are being applied/executed.'
              : '') +
              (includePreviousWarnsInOutput ? '\n\n' + previousWarnOutput : ''),
          ]
            .filter(Boolean)
            .join(' '),
        ),
      ],
      files: includePreviousWarnsInOutput
        ? []
        : [
            new AttachmentBuilder(Buffer.from(previousWarnOutput, 'utf-8'))
              .setName(`warnings-${targetUser.id}.txt`)
              .setDescription('Overview of previous warnings'),
          ],
    });

    // Apply the triggered actions with feedback
    if (triggeredActions.length) {
      const output = await ModerationServices.applyAutoModerationActions(
        moderationTarget,
        triggeredActions,
        reason,
        async (action) => {
          await ModLogServices.send({
            guild,
            discordGuild,
            message: {
              embeds: [
                client.embeds.info({
                  title: 'Auto-Moderation - Action Taken',
                  description: [
                    `**Action:** ${ModerationServices.stringifyAutoModerationAction(
                      action,
                    )}`,
                    `**User:** ${moderationTarget} (${moderationTarget.id})`,
                    `**Moderator:** ${issuerMember} (${issuerMember.id})`,
                    `**Reason:** ${reason}`,
                  ].join('\n'),
                  footer: {
                    text: `Case: #${warning.caseNumber}`,
                  },
                }),
              ],
            },
          });
        },
        async (deletedMessages) => {
          let totalDeletedCount = 0;
          const output = ChannelUtils.parseDeleteMessagesResult(
            deletedMessages,
            (_channelId, count) => {
              totalDeletedCount += count;
            },
          );

          if (!output.length || totalDeletedCount === 0) return;

          const shared = {
            title:
              'Auto-Moderation' + ` (${totalDeletedCount} message(s) deleted)`,
          };

          await ModLogServices.send({
            guild,
            discordGuild,
            message: {
              embeds: [
                client.embeds.success({
                  ...shared,
                  description: [
                    `**User:** ${moderationTarget} (${moderationTarget.id})`,
                    `**Moderator:** ${issuerMember} (${issuerMember.id})`,
                    `**Overview of messages deleted by auto-moderation actions**:\n${output}`,
                  ].join('\n'),
                  footer: {
                    text: `Case: #${warning.caseNumber}`,
                  },
                }),
              ],
            },
          });

          if (interaction.isRepliable()) {
            if (output.length > EmbedConstants.DESCRIPTION_MAX_LENGTH - 100) {
              await interaction.followUp({
                embeds: [client.embeds.info(shared)],
                files: [
                  new AttachmentBuilder(Buffer.from(output, 'utf-8'))
                    .setName(`auto-moderation-${interaction.id}.txt`)
                    .setDescription(
                      'Overview of messages deleted by auto-moderation actions',
                    ),
                ],
              });
            } else {
              await interaction.followUp({
                embeds: [
                  client.embeds.info({
                    ...shared,
                    description: output,
                  }),
                ],
              });
            }
          }
        },
      );

      await interaction.followUp({
        embeds: [
          client.embeds.info({
            title:
              'Auto-Moderation' +
              ` (${triggeredActions.length} action(s) triggered)`,
            description: output.length
              ? output.join('\n')
              : 'No actions were applied.',
          }),
        ],
      });
    }

    // Log the action
    await ModLogServices.send({
      guild,
      discordGuild,
      message: {
        embeds: [
          client.embeds.warning({
            title: 'User Warned',
            description: [
              `**User:** ${moderationTarget} (${moderationTarget.id})`,
              `**Moderator:** ${issuerMember} (${issuerMember.id})`,
              `**Severity:** \`${severity}\` (**${ModerationServices.getSeverityValue(severity, guild.SeverityConfiguration)}** points)`,
              `**Reason:** ${reason}`,
              `**Valid Until:** ${validUntilOutput}`,
              `**Warning Points:** **${warnsBefore}** before, **${warnsAfter}** after (+${warnsAfter - warnsBefore})`,
              `**Auto-Moderation Actions:** ${actionsOutput ?? 'None'}`,
            ].join('\n'),
            footer: {
              text: `Case: #${warning.caseNumber}`,
            },
          }),
        ],
      },
    });
  };

  static readonly removeWarn = async (
    member: PopulatedMember,
    {
      warningId,
      deleteWarning,
      removedBy,
    }: {
      warningId: number;
      deleteWarning: boolean;
      removedBy: PopulatedMember;
    },
  ) => {
    const warning = member.ReceivedWarnings.find(
      (entry) => entry.id === warningId,
    );

    if (!warning) {
      throw new Error(`Warning with ID ${warningId} not found.`);
    }

    const updatedMember = await Database.Member.update({
      where: {
        id: member.id,
      },
      data: {
        ReceivedWarnings: {
          delete: deleteWarning
            ? {
                id: warning.id,
              }
            : undefined,
          update: deleteWarning
            ? undefined
            : {
                where: {
                  id: warning.id,
                },
                data: {
                  removedAt: new Date(),
                  RemovedBy: {
                    connect: {
                      id: removedBy.id,
                    },
                  },
                },
              },
        },
      },
    });

    return {
      warning,
      updatedMember,
    };
  };

  static readonly handleWarnRemovalInteraction = async ({
    client,
    interaction,
    discordGuild,
    issuerMember,
    targetUser,
    warningId,
    deleteWarning,
  }: {
    client: Client;
    interaction: RepliableInteraction;
    discordGuild: Guild;
    issuerMember: GuildMember;
    targetUser: User;
    warningId: number;
    deleteWarning: boolean;
  }) => {
    // Fetch the required data
    const [guild, issuer, target] = await Promise.all([
      Database.Guild.resolve(discordGuild.id),
      Database.Member.resolve({
        userId: issuerMember.id,
        guildId: discordGuild.id,
      }),
      Database.Member.resolve({
        userId: targetUser.id,
        guildId: discordGuild.id,
      }),
    ]);

    // Check if the issuer can moderate the target
    const moderationTarget =
      await ModerationPermissionServices.handleCanModerateTarget({
        client,
        interaction,
        targetUser,
        issuerMember,
        discordGuild,
        guild,
      });

    // Return if the target is not valid/moderatable
    if (moderationTarget === false) return;

    // Process the warning removal
    const { warning, updatedMember } = await WarnServices.removeWarn(target, {
      warningId,
      deleteWarning,
      removedBy: issuer,
    });

    // Prepare the output/feedback
    const output = [
      `Successfully ${
        deleteWarning ? 'deleted' : 'removed'
      } warning with case number **\`#${warning.caseNumber}\`**.`,
    ];

    // User feedback
    await interaction.reply({
      embeds: [client.embeds.success(output.join(' '))],
    });

    // Log the action
    await ModLogServices.send({
      guild,
      discordGuild,
      message: {
        embeds: [
          client.embeds.warning({
            title: `Warning ${deleteWarning ? 'Deleted' : 'Removed'}`,
            description: [
              `**User:** ${moderationTarget} (${moderationTarget.id})`,
              `**Moderator:** ${issuerMember} (${issuerMember.id})`,
              `**Warning:** ${WarnServices.stringifyWarn(warning)}`,
              `**Warning Message:** ${warning.message}`,
              `**Warning Severity:** \`${warning.severity}\``,
              `**Warning Issuer:** <@${warning.IssuedByUserId}> (\`${warning.IssuedByUserId}\`), at ${TimeUtils.discordInfoTimestamp(
                warning.date.valueOf(),
              )}`,
              `**Warnings Now:** ${
                WarnServices.resolveWarns(updatedMember, guild).after
              }`,
            ].join('\n'),
            footer: {
              text: `Case: #${warning.caseNumber}`,
            },
          }),
        ],
      },
    });
  };
}

export { WarnServices };
