// Note: Hard to split out into separate files due to circular dependencies (const exports)

import { Prisma } from '@prisma/client';

// Prisma.AuditLog
const populateAuditLog = Prisma.validator<Prisma.AuditLogDefaultArgs>()({
  select: {
    id: true,
    type: true,
    date: true,
    data: true,
    GuildId: true,
    UserId: true,
  },
});
type PopulatedAuditLog = Prisma.AuditLogGetPayload<typeof populateAuditLog>;

// Prisma.EmbedField
const populateEmbedField = Prisma.validator<Prisma.EmbedFieldDefaultArgs>()({
  select: {
    id: true,
    EmbedId: true,
    name: true,
    value: true,
    inline: true,
  },
});
type PopulatedEmbedField = Prisma.EmbedFieldGetPayload<
  typeof populateEmbedField
>;

// Prisma.Embed
const populateEmbed = Prisma.validator<Prisma.EmbedDefaultArgs>()({
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
    fields: populateEmbedField,
  },
});
type PopulatedEmbed = Prisma.EmbedGetPayload<typeof populateEmbed>;

// Prisma.AutoModerationAction
const populateAutoModerationAction =
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
  typeof populateAutoModerationAction
>;

// Prisma.SeverityConfiguration
const populateSeverityConfiguration =
  Prisma.validator<Prisma.SeverityConfigurationDefaultArgs>()({
    select: {
      GuildId: true,
      LOW: true,
      MEDIUM: true,
      HIGH: true,
    },
  });
type PopulatedSeverityConfiguration = Prisma.SeverityConfigurationGetPayload<
  typeof populateSeverityConfiguration
>;

// Prisma.Warning
const populateWarning = Prisma.validator<Prisma.WarningDefaultArgs>()({
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
type PopulatedWarning = Prisma.WarningGetPayload<typeof populateWarning>;

// Prisma.User
const populateUser = Prisma.validator<Prisma.UserDefaultArgs>()({
  select: {
    id: true,
    timezone: true,
    risk: true,
    riskOriginGuildIds: true,
    _count: {
      select: {
        Members: true,
      },
    },
  },
});
type PopulatedUser = Prisma.UserGetPayload<typeof populateUser>;

// Prisma.Member
const populateMember = Prisma.validator<Prisma.MemberDefaultArgs>()({
  select: {
    id: true,
    UserId: true,
    GuildId: true,
    IssuedWarnings: populateWarning,
    ReceivedWarnings: populateWarning,
    _count: {
      select: {
        IssuedWarnings: true,
        ReceivedWarnings: true,
      },
    },
  },
});
type PopulatedMember = Prisma.MemberGetPayload<typeof populateMember>;

// Prisma.Guild
const populateGuild = Prisma.validator<Prisma.GuildDefaultArgs>()({
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
    SeverityConfiguration: populateSeverityConfiguration,
    AutoModerationActions: populateAutoModerationAction,

    // Utility
    autoRoleIds: true,
    memberJoinChannelId: true,
    memberLeaveChannelId: true,

    // Embed configuration
    MemberJoinEmbed: populateEmbed,
    MemberJoinEmbedId: true,
    MemberLeaveEmbed: populateEmbed,
    MemberLeaveEmbedId: true,
  },
});
type PopulatedGuild = Prisma.GuildGetPayload<typeof populateGuild>;

// Prisma.CommandCooldown
const populateCommandCooldown =
  Prisma.validator<Prisma.CommandCooldownDefaultArgs>()({
    select: {
      id: true,
      cooldownId: true,
      duration: true,
      usages: true,
    },
  });
type PopulatedCommandCooldown = Prisma.CommandCooldownGetPayload<
  typeof populateCommandCooldown
>;

// Prisma.CommandStatistics
const populateCommandStatistics =
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
  typeof populateCommandStatistics
>;

// Prisma.Reminder
const populateReminder = Prisma.validator<Prisma.ReminderDefaultArgs>()({
  select: {
    id: true,
    GuildId: true,
    channelId: true,
    message: true,
    remindAt: true,
    repeatEvery: true,
    repeatUntil: true,
    shouldDM: true,
    UserId: true,
  },
});
type PopulatedReminder = Prisma.ReminderGetPayload<typeof populateReminder>;

export {
  populateAuditLog,
  type PopulatedAuditLog,
  populateEmbed,
  type PopulatedEmbed,
  populateEmbedField,
  type PopulatedEmbedField,
  populateAutoModerationAction,
  type PopulatedAutoModerationAction,
  populateSeverityConfiguration,
  type PopulatedSeverityConfiguration,
  populateWarning,
  type PopulatedWarning,
  populateUser,
  type PopulatedUser,
  populateMember,
  type PopulatedMember,
  populateGuild,
  type PopulatedGuild,
  populateCommandCooldown,
  type PopulatedCommandCooldown,
  populateCommandStatistics,
  type PopulatedCommandStatistics,
  populateReminder,
  type PopulatedReminder,
};
