import {
  ApplicationCommandType,
  BaseInteraction,
  CacheType,
  ChatInputCommandInteraction,
  Client,
  ContextMenuCommandBuilder,
  DMChannel,
  Guild,
  GuildBasedChannel,
  GuildMember,
  MessageContextMenuCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  UserContextMenuCommandInteraction,
} from 'discord.js';

const CommandType = ApplicationCommandType;

type CommandTypeValue = (typeof CommandType)[keyof typeof CommandType];

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Array<unknown>
      ? T[P]
      : DeepPartial<T[P]>
    : T[P];
};

type CommandData<Type extends CommandTypeValue = CommandTypeValue> =
  Type extends typeof CommandType.User
    ? ContextMenuCommandBuilder
    : Type extends typeof CommandType.Message
      ? ContextMenuCommandBuilder
      : SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;

type CommandInteraction<
  Type extends CommandTypeValue = CommandTypeValue,
  Cached extends CacheType = CacheType,
> = Type extends typeof CommandType.User
  ? UserContextMenuCommandInteraction<Cached>
  : Type extends typeof CommandType.Message
    ? MessageContextMenuCommandInteraction<Cached>
    : ChatInputCommandInteraction<Cached>;

type CommandRunFunction<
  ReturnType,
  I extends BaseInteraction = BaseInteraction,
> = (client: Client<true>, interaction: I) => ReturnType;

type CacheTypeResolver<
  GuildOnly extends boolean,
  RefuseUncached extends boolean,
> = GuildOnly extends true
  ? RefuseUncached extends true
    ? Exclude<CacheType, 'raw' | undefined> // inCachedGuild = cached
    : Exclude<CacheType, undefined> // inGuild = raw | cached
  : Exclude<CacheType, 'raw'>; // inDMs = cached

type AvailableGuildInteraction<
  I extends BaseInteraction = BaseInteraction<'cached'>,
> = I & {
  guild: Guild & {
    available: true;
  };
  guildId: string;
  channel: GuildBasedChannel | null;
  member: GuildMember;
};

type DMInteraction<I extends BaseInteraction = BaseInteraction<'cached'>> =
  I & {
    guild: null;
    guildId: null;
    channel: DMChannel;
    member: null;
  };

export {
  CommandType,
  type CommandTypeValue,
  type DeepPartial,
  type CommandData,
  type CommandInteraction,
  type CommandRunFunction,
  type CacheTypeResolver,
  type AvailableGuildInteraction,
  type DMInteraction,
};
