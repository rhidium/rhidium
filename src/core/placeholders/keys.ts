import type { Guild, GuildChannel, GuildMember, User } from 'discord.js';
import type { DefaultIgnoreTypes, ExtractKeys, Placeholders } from './types';

const placeholderKeys = {
  user: [
    'accentColor',
    'avatarDecorationData.asset',
    'avatarDecorationData.skuId',
    'avatarDecoration',
    'avatar',
    'banner',
    'bot',
    'createdAt',
    'createdTimestamp',
    'defaultAvatarURL',
    'discriminator',
    'displayName',
    'dmChannel.id',
    'flags.bitfield',
    'globalName',
    'hexAccentColor',
    'id',
    'partial',
    'system',
    'tag',
    'username',
  ],
  channel: [
    'createdAt',
    'createdTimestamp',
    'flags.bitfield',
    'id',
    'partial',
    'type',
    'url',
    'deletable',
    'manageable',
    'members.size',
    'name',
    'position',
    'rawPosition',
    'viewable',
  ],
  guild: [
    'systemChannelFlags.bitfield',
    // 'afkChannel',
    'afkChannelId',
    'afkTimeout',
    'applicationId',
    'approximateMemberCount',
    'approximatePresenceCount',
    'available',
    'banner',
    'createdAt',
    'createdTimestamp',
    'description',
    'defaultMessageNotifications',
    'discoverySplash',
    'explicitContentFilter',
    'features',
    'icon',
    'id',
    // 'incidentsData',
    'joinedAt',
    'joinedTimestamp',
    'large',
    'maximumBitrate',
    'maximumMembers',
    'maximumPresences',
    'maxStageVideoChannelUsers',
    'maxVideoChannelUsers',
    'memberCount',
    'mfaLevel',
    'name',
    'nameAcronym',
    'nsfwLevel',
    'ownerId',
    'partnered',
    'preferredLocale',
    'premiumSubscriptionCount',
    'premiumProgressBarEnabled',
    'premiumTier',
    // 'publicUpdatesChannel',
    'publicUpdatesChannelId',
    // 'rulesChannel',
    'rulesChannelId',
    // 'safetyAlertsChannel',
    'safetyAlertsChannelId',
    'splash',
    'shardId',
    // 'systemChannel',
    'systemChannelFlags.bitfield',
    'systemChannelId',
    'vanityURLCode',
    'verificationLevel',
    'vanityURLUses',
    'verified',
    // 'widgetChannel',
    'widgetChannelId',
    'widgetEnabled',
  ],
  member: [
    'avatar',
    'bannable',
    'banner',
    'communicationDisabledUntilTimestamp',
    'communicationDisabledUntil',
    'displayColor',
    'displayHexColor',
    'displayName',
    // 'dmChannel',
    'flags.bitfield',
    'id',
    'joinedAt',
    'joinedTimestamp',
    'kickable',
    'manageable',
    'moderatable',
    'nickname',
    'partial',
    'pending',
    'permissions.bitfield',
    'premiumSinceTimestamp',
    'premiumSince',
    // 'presence',
    'voice.channelId',
    // 'voice.channel',
    'voice.deaf',
    'voice.mute',
    'voice.selfDeaf',
    'voice.requestToSpeakTimestamp',
    // 'voice.member',
    'voice.id',
    'voice.selfMute',
    'voice.suppress',
    'voice.streaming',
    'voice.selfVideo',
    'voice.serverDeaf',
    'voice.serverMute',
    'voice.sessionId',
  ],
} satisfies {
  user: (keyof Placeholders<
    ExtractKeys<User, '', 3, DefaultIgnoreTypes, '', ''>
  >)[];
  channel: (keyof Placeholders<
    ExtractKeys<GuildChannel, '', 3, DefaultIgnoreTypes, '', ''>
  >)[];
  guild: (keyof Placeholders<
    ExtractKeys<Guild, '', 3, DefaultIgnoreTypes, '', ''>
  >)[];
  member: (keyof Placeholders<
    ExtractKeys<GuildMember, '', 3, DefaultIgnoreTypes, '', ''>
  >)[];
};

type UserPlaceholders = Placeholders<
  (typeof placeholderKeys.user)[number],
  string
>;
type MemberPlaceholders = Placeholders<
  (typeof placeholderKeys.member)[number],
  string
>;
type GuildPlaceholders = Placeholders<
  (typeof placeholderKeys.guild)[number],
  string
>;
type ChannelPlaceholders = Placeholders<
  (typeof placeholderKeys.channel)[number],
  string
>;

export {
  placeholderKeys,
  type UserPlaceholders,
  type MemberPlaceholders,
  type GuildPlaceholders,
  type ChannelPlaceholders,
};
