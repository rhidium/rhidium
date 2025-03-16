// Note: Hard to split out into separate files due to circular dependencies (const exports)

import { Prisma } from '@prisma/client';

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

// Prisma.User
const populatedUser = Prisma.validator<Prisma.UserDefaultArgs>()({
  select: {
    id: true,
  },
});
type PopulatedUser = Prisma.UserGetPayload<typeof populatedUser>;

// Prisma.Member
const populatedMember = Prisma.validator<Prisma.MemberDefaultArgs>()({
  select: {
    id: true,
    User: populatedUser,
    GuildId: true,
  },
});
type PopulatedMember = Prisma.MemberGetPayload<typeof populatedMember>;

// Prisma.Guild
const populatedGuild = Prisma.validator<Prisma.GuildDefaultArgs>()({
  select: {
    id: true,
    // Role configuration
    autoRoleIds: true,
    adminRoleId: true,
    adminLogChannelId: true,
    modRoleId: true,
    modLogChannelId: true,
    // Embed configuration
    memberJoinChannelId: true,
    MemberJoinEmbed: populatedEmbed,
    MemberJoinEmbedId: true,
    memberLeaveChannelId: true,
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
  populatedEmbed,
  type PopulatedEmbed,
  populatedEmbedField,
  type PopulatedEmbedField,
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
