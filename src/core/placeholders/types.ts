import Client from '@core/client';
import {
  GuildChannel,
  Guild,
  GuildMember,
  User,
  Client as DiscordClient,
  AutoModerationRuleManager,
  GuildBanManager,
  GuildChannelManager,
  GuildApplicationCommandManager,
  GuildEmojiManager,
  GuildInviteManager,
  GuildMemberManager,
  PresenceManager,
  GuildScheduledEventManager,
  StageInstanceManager,
  GuildStickerManager,
  VoiceStateManager,
  GuildMemberRoleManager,
  GuildEmojiRoleManager,
  RoleManager,
  WebSocketShard,
  ThreadChannel,
  Message,
} from 'discord.js';

type DecrementDepth = [0, 0, 1, 2, 3, 4, 5];

type DefaultIgnoreTypes =
  | Function
  | symbol
  | undefined
  | Message
  | Client
  | User
  | Guild
  | DiscordClient
  | AutoModerationRuleManager
  | GuildBanManager
  | RoleManager
  | GuildMemberRoleManager
  | GuildEmojiRoleManager
  | GuildChannelManager
  | GuildApplicationCommandManager
  | GuildEmojiManager
  | GuildInviteManager
  | GuildMemberManager
  | PresenceManager
  | GuildScheduledEventManager
  | StageInstanceManager
  | GuildStickerManager
  | VoiceStateManager
  | WebSocketShard;

type ExtractKeys<
  T,
  Prefix extends string = '',
  Depth extends number = 3,
  IgnoreTypes = DefaultIgnoreTypes,
  OpenBracket extends string = '{',
  CloseBracket extends string = '}',
> = Depth extends 0
  ? never
  : {
        [K in keyof T]: NonNullable<T[K]> extends IgnoreTypes
          ? never
          : NonNullable<T[K]> extends object
            ? NonNullable<T[K]> extends Date
              ? `${OpenBracket}${Prefix}${string & K}${CloseBracket}`
              : NonNullable<T[K]> extends Array<infer U>
                ?
                    | `${OpenBracket}${Prefix}${string & K}${CloseBracket}`
                    | `${OpenBracket}${Prefix}${string & K}[${string & U}]${CloseBracket}`
                : ExtractKeys<
                    NonNullable<T[K]>,
                    `${Prefix}${string & K}.`,
                    DecrementDepth[Depth],
                    IgnoreTypes,
                    OpenBracket,
                    CloseBracket
                  >
            : `${OpenBracket}${Prefix}${string & K}${CloseBracket}`;
      }[keyof T] extends infer U
    ? U extends string | number | symbol
      ? U
      : never
    : never;

type Placeholders<
  Key extends string | number | symbol | undefined,
  Value extends string = string,
> = Record<Exclude<Key, undefined>, Value>;

type UserPlaceholders<Prefix extends string = ''> = Placeholders<
  ExtractKeys<User, Prefix>
>;
type MemberPlaceholders<Prefix extends string = ''> = Placeholders<
  ExtractKeys<GuildMember, Prefix>
>;
type GuildPlaceholders<Prefix extends string = ''> = Placeholders<
  ExtractKeys<Guild, Prefix>
>;
type ChannelPlaceholders<Prefix extends string = ''> = Placeholders<
  ExtractKeys<GuildChannel | ThreadChannel, Prefix>
>;

type ContextPlaceholders =
  | UserPlaceholders<'user.'>
  | MemberPlaceholders<'member.'>
  | GuildPlaceholders<'guild.'>
  | ChannelPlaceholders<'channel.'>;

export {
  type DecrementDepth,
  type DefaultIgnoreTypes,
  type ExtractKeys,
  type Placeholders,
  type UserPlaceholders,
  type MemberPlaceholders,
  type GuildPlaceholders,
  type ChannelPlaceholders,
  /**
   * Placeholders we generally make available to the user
   */
  type ContextPlaceholders,
};
