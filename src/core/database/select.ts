// Note: Hard to split out into separate files due to circular dependencies (const exports)

import { Prisma } from '@prisma/client';

// Prisma.Webhook
const populateWebhook = Prisma.validator<Prisma.WebhookDefaultArgs>()({
  select: {
    id: true,
    name: true,
    url: true,
    secret: true,

    active: true,
    deliveries: true,
    lastDeliveredAt: true,
    fails: true,
    lastFailedAt: true,

    createdAt: true,
    updatedAt: true,

    GameServerId: true,
  },
});
type PopulatedWebhook = Prisma.WebhookGetPayload<typeof populateWebhook>;

// Prisma.WorkshopMod
const populateWorkshopMod = Prisma.validator<Prisma.WorkshopModDefaultArgs>()({
  select: {
    id: true,
    name: true,
    description: true,
    workshopId: true,
    appId: true,
    version: true,

    banned: true,
    bannedReason: true,
    bannedAt: true,

    removed: true,
    removedReason: true,
    removedAt: true,

    fetches: true,
    updates: true,
    relays: true,
    lastFetchedAt: true,
    lastUpdatedAt: true,

    createdAt: true,
    updatedAt: true,
  },
});
type PopulatedWorkshopMod = Prisma.WorkshopModGetPayload<typeof populateWorkshopMod>;

// Prisma.GameServer
const populateGameServer = Prisma.validator<Prisma.GameServerDefaultArgs>()({
  select: {
    id: true,
    appId: true,
    themeColor: true,
    name: true,
    description: true,
    ipv4: true,
    gameport: true,
    steamQueryPort: true,
    status: true,
    players: true,
    maxPlayers: true,
    lastUpdated: true,

    Mods: {
      select: {
        id: true,
      }
    },
    modUpdates: true,
    modUpdateAt: true,
    WebhookId: true,
    Webhook: populateWebhook,
    LastUpdatedModId: true,

    createdAt: true,
    updatedAt: true,

    GuildId: true,
  },
});
type PopulatedGameServer = Prisma.GameServerGetPayload<typeof populateGameServer>;

// Prisma.Settings
const populateSettings = Prisma.validator<Prisma.SettingsDefaultArgs>()({
  select: {
    id: true,
    commandUsageSummaryLastProcessedAt: true,
  },
});
type PopulatedSettings = Prisma.SettingsGetPayload<typeof populateSettings>;

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

    // Workshop Monitor featues
    GameServers: populateGameServer,
  },
});
type PopulatedGuild = Prisma.GuildGetPayload<typeof populateGuild>;

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

// Prisma.Command
const populateCommand = Prisma.validator<Prisma.CommandDefaultArgs>()({
  select: {
    id: true,
    data: true,
    GuildId: true,
  },
});
type PopulatedCommand = Prisma.CommandGetPayload<typeof populateCommand>;

// Prisma.CommandUsage
const populateCommandUsage = Prisma.validator<Prisma.CommandUsageDefaultArgs>()(
  {
    select: {
      key: true,
      usages: true,
      consumedUsageCount: true,
      CommandId: true,
      userId: true,
      channelId: true,
      guildId: true,
      expireThreshold: true,
      runtime: true,
      runtimeErrors: true,
    },
  },
);
type PopulatedCommandUsage = Prisma.CommandUsageGetPayload<
  typeof populateCommandUsage
>;

// Prisma.CommandUsageSummary
const populateCommandUsageSummary =
  Prisma.validator<Prisma.CommandUsageSummaryDefaultArgs>()({
    select: {
      CommandId: true,
      date: true,
      totalUsages: true,
      uniqueUsers: true,
      uniqueChannels: true,
      uniqueGuilds: true,
      uniqueErrors: true,
      runtimeTot: true,
      runtimeAvg: true,
      runtimeMin: true,
      runtimeMax: true,
      runtimeMea: true,
      runtimeMed: true,
      runtimeVar: true,
      runtimeStD: true,
    },
  });
type PopulatedCommandUsageSummary = Prisma.CommandUsageSummaryGetPayload<
  typeof populateCommandUsageSummary
>;

export {
  populateSettings,
  type PopulatedSettings,
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
  populateReminder,
  type PopulatedReminder,
  populateCommand,
  type PopulatedCommand,
  populateCommandUsage,
  type PopulatedCommandUsage,
  populateCommandUsageSummary,
  type PopulatedCommandUsageSummary,
  populateGameServer,
  type PopulatedGameServer,
  populateWorkshopMod,
  type PopulatedWorkshopMod,
  populateWebhook,
  type PopulatedWebhook,
};
