// Note: Hard to split out into separate files due to circular dependencies (const exports)

import { Prisma } from '@prisma/client';

// Prisma.AuditLog
const populatedAuditLog = Prisma.validator<Prisma.AuditLogDefaultArgs>()({
  select: {
    id: true,
    type: true,
    date: true,
    data: true,
    GuildId: true,
    UserId: true,
  },
});
type PopulatedAuditLog = Prisma.AuditLogGetPayload<typeof populatedAuditLog>;

// Prisma.EmbedField
const populatedEmbedField = Prisma.validator<Prisma.EmbedFieldDefaultArgs>()({
  select: {
    id: true,
    EmbedId: true,
    name: true,
    value: true,
    inline: true,
  },
});
type PopulatedEmbedField = Prisma.EmbedFieldGetPayload<
  typeof populatedEmbedField
>;

// Prisma.Embed
const populatedEmbed = Prisma.validator<Prisma.EmbedDefaultArgs>()({
  select: {
    id: true,
    GuildId: true,
    messageText: true,
    color: true,
    authorName: true,
    authorIconURL: true,
    authorURL: true,
    title: true,
    description: true,
    url: true,
    imageURL: true,
    thumbnailURL: true,
    footerText: true,
    footerIconURL: true,
    fields: populatedEmbedField,
  },
});
type PopulatedEmbed = Prisma.EmbedGetPayload<typeof populatedEmbed>;

// Prisma.AutoModerationAction
const populatedAutoModerationAction =
  Prisma.validator<Prisma.AutoModerationActionDefaultArgs>()({
    select: {
      id: true,
      action: true,
      triggerThreshold: true,
      actionDurationMs: true,
      deleteMessageSeconds: true,
      oncePerMember: true,
      GuildId: true,
      ExecutedWarnings: {
        select: {
          id: true,
          IssuedByGuildId: true,
          IssuedByUserId: true,
          MemberGuildId: true,
          MemberUserId: true,
        },
      },
    },
  });
type PopulatedAutoModerationAction = Prisma.AutoModerationActionGetPayload<
  typeof populatedAutoModerationAction
>;

// Prisma.SeverityConfiguration
const populatedSeverityConfiguration =
  Prisma.validator<Prisma.SeverityConfigurationDefaultArgs>()({
    select: {
      GuildId: true,
      LOW: true,
      MEDIUM: true,
      HIGH: true,
    },
  });
type PopulatedSeverityConfiguration = Prisma.SeverityConfigurationGetPayload<
  typeof populatedSeverityConfiguration
>;

// Prisma.Warning
const populatedWarning = Prisma.validator<Prisma.WarningDefaultArgs>()({
  select: {
    id: true,
    caseNumber: true,
    severity: true,
    message: true,
    date: true,
    validUntil: true,
    removedAt: true,
    MemberUserId: true,
    MemberGuildId: true,
    IssuedByUserId: true,
    IssuedByGuildId: true,
    RemovedByUserId: true,
    RemovedByGuildId: true,
    TriggeredActions: {
      select: {
        id: true,
      },
    },
  },
});
type PopulatedWarning = Prisma.WarningGetPayload<typeof populatedWarning>;

// Prisma.User
const populatedUser = Prisma.validator<Prisma.UserDefaultArgs>()({
  select: {
    id: true,
    risk: true,
    riskOriginGuildIds: true,
    _count: {
      select: {
        Members: true,
      },
    },
  },
});
type PopulatedUser = Prisma.UserGetPayload<typeof populatedUser>;

// Prisma.Member
const populatedMember = Prisma.validator<Prisma.MemberDefaultArgs>()({
  select: {
    id: true,
    UserId: true,
    GuildId: true,
    IssuedWarnings: populatedWarning,
    ReceivedWarnings: populatedWarning,
    _count: {
      select: {
        IssuedWarnings: true,
        ReceivedWarnings: true,
      },
    },
  },
});
type PopulatedMember = Prisma.MemberGetPayload<typeof populatedMember>;

// Prisma.Guild
const populatedGuild = Prisma.validator<Prisma.GuildDefaultArgs>()({
  select: {
    id: true,
    CaseCounterId: true,

    // Permissions and audit
    adminRoleIds: true,
    adminUserIds: true,
    auditLogChannelId: true,
    modRoleIds: true,
    modLogChannelId: true,
    disabledCommands: true,
    modsCanModerateMods: true,

    // Moderation
    SeverityConfiguration: populatedSeverityConfiguration,
    AutoModerationActions: populatedAutoModerationAction,

    // Utility
    autoRoleIds: true,
    memberJoinChannelId: true,
    memberLeaveChannelId: true,

    // Embed configuration
    MemberJoinEmbed: populatedEmbed,
    MemberJoinEmbedId: true,
    MemberLeaveEmbed: populatedEmbed,
    MemberLeaveEmbedId: true,
  },
});
type PopulatedGuild = Prisma.GuildGetPayload<typeof populatedGuild>;

// Prisma.CommandCooldown
const populatedCommandCooldown =
  Prisma.validator<Prisma.CommandCooldownDefaultArgs>()({
    select: {
      id: true,
      cooldownId: true,
      duration: true,
      usages: true,
    },
  });
type PopulatedCommandCooldown = Prisma.CommandCooldownGetPayload<
  typeof populatedCommandCooldown
>;

// Prisma.CommandStatistics
const populatedCommandStatistics =
  Prisma.validator<Prisma.CommandStatisticsDefaultArgs>()({
    select: {
      id: true,
      type: true,
      commandId: true,
      usages: true,
      lastUsedAt: true,
      firstUsedAt: true,
      errorCount: true,
      lastError: true,
      lastErrorAt: true,
      runtimeCount: true,
      runtimeTotal: true,
      runtimeMax: true,
      runtimeMin: true,
      runtimeMean: true,
      runtimeMedian: true,
      runtimeVariance: true,
      runtimeStdDeviation: true,
    },
  });
type PopulatedCommandStatistics = Prisma.CommandStatisticsGetPayload<
  typeof populatedCommandStatistics
>;

export {
  populatedAuditLog,
  type PopulatedAuditLog,
  populatedEmbed,
  type PopulatedEmbed,
  populatedEmbedField,
  type PopulatedEmbedField,
  populatedAutoModerationAction,
  type PopulatedAutoModerationAction,
  populatedSeverityConfiguration,
  type PopulatedSeverityConfiguration,
  populatedWarning,
  type PopulatedWarning,
  populatedUser,
  type PopulatedUser,
  populatedMember,
  type PopulatedMember,
  populatedGuild,
  type PopulatedGuild,
  populatedCommandCooldown,
  type PopulatedCommandCooldown,
  populatedCommandStatistics,
  type PopulatedCommandStatistics,
};
