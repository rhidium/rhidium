import { ArrayUtils, InteractionUtils, TimeUtils } from '@lib';
import {
  APIInteractionGuildMember,
  ChannelType,
  Guild,
  GuildBasedChannel,
  GuildExplicitContentFilter,
  GuildMFALevel,
  GuildMember,
  GuildNSFWLevel,
  GuildVerificationLevel,
  PartialGuildMember,
  User,
} from 'discord.js';
import { PlaceholderString } from '.';

// [TRANSLATE] - Some unfortunate soul will have to translate this

export type ChannelPlaceholders = {
  '#channel': string;
  channelCreatedAt: string;
  channelCreatedTS: string;
  channelId: string;
  channelName: string;
  channelNSFW: string;
  channelParentId: string;
  channelParentName: string;
  channelPosition: string;
  channelTopic: string;
  channelType: string;
  channelURL: string;
  channelMemberCount: string;
};

export type GuildPlaceholders = {
  serverAFKChannelId: string;
  serverAFKChannelName: string;
  serverAFKTimeout: string;
  serverBannerHash: string;
  serverBannerURL: string;
  serverChannelCount: string;
  serverCreatedAt: string;
  serverCreatedTS: string;
  serverDescription: string;
  serverDiscoverySplashHash: string;
  serverDiscoverySplashURL: string;
  serverEmojiCount: string;
  serverExplicitContentFilter: string;
  serverFeatures: string;
  serverIconHash: string;
  serverIconURL: string;
  serverId: string;
  serverMaxMembers: string;
  serverMemberCount: string;
  serverMFALevel: string;
  serverName: string;
  serverNameAcronym: string;
  serverNSFWLevel: string;
  serverOwnerId: string;
  '@serverOwner': string;
  serverPartnered: string;
  serverPreferredLocale: string;
  serverPremiumTier: string;
  serverBoostCount: string;
  serverRoleCount: string;
  serverRulesChannelId: string;
  serverRulesChannelName: string;
  '#serverRulesChannel': string;
  serverAutoModChannelId: string;
  serverAutoModChannelName: string;
  '#serverAutoModChannel': string;
  serverShardId: string;
  serverSplashHash: string;
  serverSplashURL: string;
  serverStickerCount: string;
  serverSystemChannelId: string;
  serverSystemChannelName: string;
  '#serverSystemChannel': string;
  serverVanityURLCode: string;
  serverVerificationLevel: string;
  serverVerified: string;
  serverWidgetChannelId: string;
  serverWidgetChannelName: string;
  '#serverWidgetChannel': string;
};

export type MemberPlaceholders = {
  '@member': string;
  memberAvatarHash: string;
  memberAvatarURL: string;
  memberTimedOutUntil: string;
  memberTimedOutUntilTS: string;
  memberDisplayColor: string;
  memberDisplayHexColor: string;
  memberDisplayName: string;
  memberId: string;
  memberJoinedAt: string;
  memberJoinedTS: string;
  memberNickname: string;
  memberPending: string;
  memberPermissions: string;
  memberPremiumSince: string;
  memberPremiumSinceTS: string;
  memberRoleCount: string;
  memberRoles: string;
};

export type UserPlaceholders = {
  '@user': string;
  userAccentColor: string;
  userAccentColorHex: string;
  userAvatarHash: string;
  userAvatarURL: string;
  userAvatarDecoration: string;
  userBannerHash: string;
  userBannerURL: string;
  userBot: string;
  userCreatedAt: string;
  userCreatedTS: string;
  userDefaultAvatarURL: string;
  userDisplayName: string;
  userGlobalName: string;
  userId: string;
  userUsername: string;
};

export type DiscordPlaceholders = ChannelPlaceholders &
  GuildPlaceholders &
  MemberPlaceholders &
  UserPlaceholders;

export type DiscordPlaceholderKey = keyof DiscordPlaceholders;

export type DiscordPlaceholderString = PlaceholderString<DiscordPlaceholderKey>;

/**
 * Every group should have a maximum of 25 placeholders
 */
export const organizedDiscordPlaceholders: Record<
  DiscordPlaceholderKey,
  string
> &
  Record<`{{SEPARATOR-${string}}}`, null> = {
  '{{SEPARATOR-CHANNEL}}': null,

  '#channel': 'Mention/tag the channel (clickable)',
  channelCreatedAt: 'When the channel was created',
  channelCreatedTS: 'Timestamp of when the channel was created',
  channelId: 'The ID of the channel',
  channelName: 'The name of the channel',
  channelNSFW: 'Whether the channel is NSFW or not',
  channelParentId: 'The ID of the parent channel',
  channelParentName: 'The name of the parent channel',
  channelPosition: 'The position of the channel',
  channelTopic: 'The topic of the channel',
  channelType: 'The type of the channel',
  channelURL: 'The URL of the channel',
  channelMemberCount: 'The number of members in the channel',

  '{{SEPARATOR-MEMBER}}': null,

  '@member': 'Mention/tag the member (clickable)',
  memberAvatarHash: 'The avatar hash of the member',
  memberAvatarURL: 'The avatar URL of the member',
  memberTimedOutUntil: "When the member's communication is disabled until",
  memberTimedOutUntilTS: "When the member's communication is disabled until",
  memberDisplayColor: 'The display color of the member',
  memberDisplayHexColor: 'The display color of the member in Hex format',
  memberDisplayName: 'The display name of the member',
  memberId: 'The ID of the member',
  memberJoinedAt: 'When the member joined the server',
  memberJoinedTS: 'Timestamp of when the member joined the server',
  memberNickname: 'The nickname of the member',
  memberPending: 'Whether the member verification is pending or not',
  memberPermissions: 'The permissions of the member',
  memberPremiumSince: 'When the member boosted the server',
  memberPremiumSinceTS: 'Timestamp of when the member boosted the server',
  memberRoleCount: 'The number of roles the member has',
  memberRoles: 'The roles the member has',

  '{{SEPARATOR-SERVER}}': null,

  serverAFKChannelId: 'The ID of the AFK channel',
  serverAFKChannelName: 'The name of the AFK channel',
  serverAFKTimeout: 'The AFK timeout of the server',
  serverBannerHash: 'The banner hash of the server',
  serverBannerURL: 'The banner URL of the server',
  serverChannelCount: 'The number of channels in the server',
  serverCreatedAt: 'When the server was created',
  serverCreatedTS: 'Timestamp of when the server was created',
  serverDescription: 'The description of the server',
  serverDiscoverySplashHash: 'The discovery splash hash of the server',
  serverDiscoverySplashURL: 'The discovery splash URL of the server',
  serverEmojiCount: 'The number of emojis in the server',
  serverExplicitContentFilter: 'The explicit content filter of the server',
  serverFeatures: 'The features of the server',
  serverIconHash: 'The icon hash of the server',
  serverIconURL: 'The icon URL of the server',
  serverId: 'The ID of the server',
  serverMaxMembers: 'The maximum number of members in the server',
  serverMemberCount: 'The number of members in the server',
  serverMFALevel: 'The MFA level of the server',
  serverName: 'The name of the server',
  serverNameAcronym: 'The name acronym of the server',
  serverNSFWLevel: 'The NSFW level of the server',
  serverOwnerId: 'The ID of the owner of the server',
  '@serverOwner': 'Mention/tag the owner of the server (clickable)',

  '{{SEPARATOR-SERVER-2}}': null,

  serverPartnered: 'Whether the server is partnered or not',
  serverPreferredLocale: 'The preferred locale of the server',
  serverPremiumTier: 'The premium tier of the server',
  serverBoostCount: 'The number of premium subscriptions of the server',
  serverRoleCount: 'The number of roles in the server',
  serverRulesChannelId: 'The ID of the rules channel',
  serverRulesChannelName: 'The name of the rules channel',
  '#serverRulesChannel': 'Mention/tag the rules channel (clickable)',
  serverAutoModChannelId: 'The ID of the safety alerts channel',
  serverAutoModChannelName: 'The name of the safety alerts channel',
  '#serverAutoModChannel': 'Mention/tag the safety alerts channel (clickable)',
  serverShardId: 'The shard ID of the server',
  serverSplashHash: 'The splash hash of the server',
  serverSplashURL: 'The splash URL of the server',
  serverStickerCount: 'The number of stickers in the server',
  serverSystemChannelId: 'The ID of the system channel',
  serverSystemChannelName: 'The name of the system channel',
  '#serverSystemChannel': 'Mention/tag the system channel (clickable)',
  serverVanityURLCode: 'The vanity URL code of the server',
  serverVerificationLevel: 'The verification level of the server',
  serverVerified: 'Whether the server is verified or not',
  serverWidgetChannelId: 'The ID of the widget channel',
  serverWidgetChannelName: 'The name of the widget channel',
  '#serverWidgetChannel': 'Mention/tag the widget channel (clickable)',

  '{{SEPARATOR-USER}}': null,

  '@user': 'Mention/tag the user (clickable)',
  userAccentColor: 'The accent color of the user',
  userAccentColorHex: 'The accent color of the user in Hex format',
  userAvatarHash: 'The avatar hash of the user',
  userAvatarURL: 'The avatar URL of the user',
  userAvatarDecoration: 'The avatar decoration of the user',
  userBannerHash: 'The banner hash of the user',
  userBannerURL: 'The banner URL of the user',
  userBot: 'Whether the user is a bot or not',
  userCreatedAt: 'When the user was created',
  userCreatedTS: 'Timestamp of when the user was created',
  userDefaultAvatarURL: 'The default avatar URL of the user',
  userDisplayName: 'The display name of the user',
  userGlobalName: 'The global name of the user',
  userId: 'The ID of the user',
  userUsername: 'The username of the user',
};

export const discordPlaceholders = Object.fromEntries(
  Object.entries(organizedDiscordPlaceholders).filter(
    ([, value]) => value !== null,
  ),
) as Record<DiscordPlaceholderKey, string>;

export const discordPlaceholderStrings = Object.keys(discordPlaceholders).map(
  (e) => `{{${e}}}` as DiscordPlaceholderString,
);

export const lowercaseDiscordPlaceholderStrings = discordPlaceholderStrings.map(
  (placeholder) => placeholder.toLowerCase(),
);

export const groupedDiscordPlaceholders = Object.fromEntries(
  Object.entries(organizedDiscordPlaceholders).reduce(
    (acc, [key, value]) => {
      const sep = '{{SEPARATOR-';
      const sepEnd = '}}';
      if (key.startsWith(sep)) {
        const groupName = key.substring(sep.length, key.length - sepEnd.length);
        acc.push([groupName, {} as Record<DiscordPlaceholderKey, string>]);
      } else {
        const group = acc[acc.length - 1]![1];
        if (value !== null) {
          group[key as keyof typeof group] = value;
        }
      }
      return acc;
    },
    [] as [string, Record<DiscordPlaceholderKey, string>][],
  ),
);

export const buildDiscordPlaceholders = (
  channel: GuildBasedChannel | null,
  guild: Guild,
  member: GuildMember | APIInteractionGuildMember | PartialGuildMember,
  user: User,
): Required<DiscordPlaceholders> => {
  const threadOrCategory =
    channel &&
    (channel.type === ChannelType.GuildCategory || channel.isThread());
  const resolvedMember =
    member instanceof GuildMember
      ? member
      : guild.members.resolve(member.user.id);

  return {
    '#channel': channel?.toString() ?? 'n/a',
    channelCreatedAt: channel?.createdAt
      ? TimeUtils.discordInfoTimestamp(channel?.createdAt.valueOf())
      : 'n/a',
    channelCreatedTS: channel?.createdTimestamp?.toString() ?? 'n/a',
    channelId: channel?.id ?? 'n/a',
    channelName: channel?.name ?? 'n/a',
    channelNSFW: channel
      ? threadOrCategory
        ? 'n/a'
        : `${channel?.nsfw ?? 'n/a'}`
      : 'n/a',
    channelParentId: channel?.parentId ?? 'None',
    channelParentName: channel?.parent?.name ?? 'None',
    channelPosition:
      channel && !threadOrCategory ? channel.position.toString() : 'n/a',
    channelTopic:
      channel && (threadOrCategory || channel.isVoiceBased())
        ? 'n/a'
        : (channel?.topic ?? 'None'),
    channelType: channel
      ? InteractionUtils.channelTypeToString(channel.type)
      : 'n/a',
    channelURL: channel?.toString() ?? 'n/a',
    channelMemberCount: !channel
      ? 'n/a'
      : channel.isThread()
        ? channel.members.cache.size.toString()
        : channel.members.size.toString(),

    '@member': resolvedMember?.toString() ?? 'Unknown',
    memberAvatarHash: resolvedMember?.user.avatar ?? 'None',
    memberAvatarURL: resolvedMember?.user.avatarURL() ?? 'None',
    memberTimedOutUntil: resolvedMember?.communicationDisabledUntil
      ? TimeUtils.discordInfoTimestamp(
          resolvedMember?.communicationDisabledUntil.valueOf(),
        )
      : 'None',
    memberTimedOutUntilTS:
      resolvedMember?.communicationDisabledUntil?.valueOf().toString() ??
      'Unknown',
    memberDisplayColor: resolvedMember?.displayColor.toString() ?? 'Unknown',
    memberDisplayHexColor: resolvedMember?.displayHexColor ?? 'Unknown',
    memberDisplayName: resolvedMember?.displayName ?? 'Unknown',
    memberId: resolvedMember?.id ?? 'Unknown',
    memberJoinedAt: resolvedMember?.joinedAt
      ? TimeUtils.discordInfoTimestamp(resolvedMember?.joinedAt.valueOf())
      : '',
    memberJoinedTS: resolvedMember?.joinedTimestamp?.toString() ?? 'Unknown',
    memberNickname: resolvedMember?.nickname ?? 'None',
    memberPending: resolvedMember?.pending.toString() ?? 'Unknown',
    memberPermissions:
      resolvedMember?.permissions.toArray().join(', ') ?? 'Unknown',
    memberPremiumSince: resolvedMember?.premiumSince
      ? TimeUtils.discordInfoTimestamp(resolvedMember?.premiumSince.valueOf())
      : '',
    memberPremiumSinceTS:
      resolvedMember?.premiumSince?.valueOf().toString() ?? 'Unknown',
    memberRoleCount: resolvedMember?.roles.cache.size.toString() ?? 'Unknown',
    memberRoles: ArrayUtils.joinWithLimit(
      resolvedMember?.roles.cache.map((role) => role.toString()) ?? [],
      10,
    ),

    serverAFKChannelId: guild.afkChannelId ?? 'None',
    serverAFKChannelName: guild.afkChannel?.name ?? 'None',
    serverAFKTimeout: guild.afkTimeout.toString(),
    serverBannerHash: guild.banner ?? 'None',
    serverBannerURL: guild.bannerURL() ?? 'None',
    serverChannelCount: guild.channels.cache.size.toString(),
    serverCreatedAt: guild.createdAt.toString(),
    serverCreatedTS: guild.createdTimestamp.toString(),
    serverDescription: guild.description ?? 'None',
    serverDiscoverySplashHash: guild.discoverySplash ?? 'None',
    serverDiscoverySplashURL: guild.discoverySplashURL() ?? 'None',
    serverEmojiCount: guild.emojis.cache.size.toString(),
    serverExplicitContentFilter:
      guild.explicitContentFilter === GuildExplicitContentFilter.AllMembers
        ? 'All Members'
        : guild.explicitContentFilter ===
            GuildExplicitContentFilter.MembersWithoutRoles
          ? 'Members Without Roles'
          : 'Disabled',
    serverFeatures: guild.features.join(', '),
    serverIconHash: guild.icon ?? 'None',
    serverIconURL: guild.iconURL() ?? 'None',
    serverId: guild.id,
    serverMaxMembers: guild.maximumMembers
      ? guild.maximumMembers.toString()
      : 'Unknown',
    serverMemberCount: guild.memberCount.toString(),
    serverMFALevel:
      guild.mfaLevel === GuildMFALevel.Elevated ? 'Elevated' : 'None',
    serverName: guild.name,
    serverNameAcronym: guild.nameAcronym,
    serverNSFWLevel:
      guild.nsfwLevel === GuildNSFWLevel.AgeRestricted
        ? 'Age Restricted'
        : guild.nsfwLevel === GuildNSFWLevel.Explicit
          ? 'Explicit'
          : guild.nsfwLevel === GuildNSFWLevel.Safe
            ? 'Safe'
            : 'Default',
    serverOwnerId: guild.ownerId,
    '@serverOwner': `<@${guild.ownerId}`,
    serverPartnered: guild.partnered.toString(),
    serverPreferredLocale: guild.preferredLocale,
    serverPremiumTier:
      guild.premiumTier === 0 ? 'None' : `Tier ${guild.premiumTier}`,
    serverBoostCount: guild.premiumSubscriptionCount
      ? guild.premiumSubscriptionCount.toString()
      : 'None',
    serverRoleCount: guild.roles.cache.size.toString(),
    serverRulesChannelId: guild.rulesChannelId ?? 'None',
    serverRulesChannelName: guild.rulesChannel?.name ?? 'None',
    '#serverRulesChannel': guild.rulesChannel?.toString() ?? 'None',
    serverAutoModChannelId: guild.publicUpdatesChannelId ?? 'None',
    serverAutoModChannelName: guild.publicUpdatesChannel?.name ?? 'None',
    '#serverAutoModChannel': guild.publicUpdatesChannel?.toString() ?? 'None',
    serverShardId: guild.shardId.toString(),
    serverSplashHash: guild.splash ?? 'None',
    serverSplashURL: guild.splashURL() ?? 'None',
    serverStickerCount: guild.stickers.cache.size.toString(),
    serverSystemChannelId: guild.systemChannelId ?? 'None',
    serverSystemChannelName: guild.systemChannel?.name ?? 'None',
    serverVanityURLCode: guild.vanityURLCode ?? 'None',
    serverVerificationLevel:
      guild.verificationLevel === GuildVerificationLevel.VeryHigh
        ? 'Very High'
        : guild.verificationLevel === GuildVerificationLevel.High
          ? 'High'
          : guild.verificationLevel === GuildVerificationLevel.Medium
            ? 'Medium'
            : guild.verificationLevel === GuildVerificationLevel.Low
              ? 'Low'
              : 'None',
    serverVerified: guild.verified.toString(),
    serverWidgetChannelId: guild.widgetChannelId ?? 'None',
    serverWidgetChannelName: guild.widgetChannel?.name ?? 'None',
    '#serverSystemChannel': guild.systemChannel?.toString() ?? 'None',
    '#serverWidgetChannel': guild.widgetChannel?.toString() ?? 'None',

    '@user': user.toString(),
    userAccentColor: user.accentColor ? `${user.accentColor}` : 'None',
    userAccentColorHex: user.hexAccentColor ?? 'None',
    userAvatarDecoration: user.avatarDecoration ?? 'None',
    userAvatarHash: user.avatar ?? 'None',
    userAvatarURL: user.avatarURL() ?? 'None',
    userBannerHash: user.banner ?? 'None',
    userBannerURL: user.bannerURL() ?? 'None',
    userBot: user.bot.toString(),
    userCreatedAt: TimeUtils.discordInfoTimestamp(user.createdAt.valueOf()),
    userCreatedTS: user.createdTimestamp.toString(),
    userDefaultAvatarURL: user.defaultAvatarURL ?? 'None',
    userDisplayName: user.username,
    userGlobalName: user.globalName ?? 'None',
    userId: user.id,
    userUsername: user.username,
  };
};
