import {
  BaseInteraction,
  ButtonBuilder,
  ButtonInteraction,
  CacheType,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ChatInputCommandInteraction,
  Client,
  ContextMenuCommandBuilder,
  DMChannel,
  Guild,
  GuildBasedChannel,
  GuildMember,
  MentionableSelectMenuBuilder,
  MentionableSelectMenuInteraction,
  MessageContextMenuCommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  RoleSelectMenuBuilder,
  RoleSelectMenuInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  UserContextMenuCommandInteraction,
  UserSelectMenuBuilder,
  UserSelectMenuInteraction,
} from 'discord.js';

enum CommandType {
  ChatInput = 'ChatInput',
  UserContextMenu = 'UserContextMenu',
  MessageContextMenu = 'MessageContextMenu',
  PrimaryEntryPoint = 'PrimaryEntryPoint',
  Button = 'Button',
  StringSelect = 'StringSelect',
  UserSelect = 'UserSelect',
  RoleSelect = 'RoleSelect',
  MentionableSelect = 'MentionableSelect',
  ChannelSelect = 'ChannelSelect',
  ModalSubmit = 'ModalSubmit',
}

type APICommandTypeValue = Exclude<
  (typeof CommandType)[keyof typeof CommandType],
  | 'Button'
  | 'StringSelect'
  | 'UserSelect'
  | 'RoleSelect'
  | 'MentionableSelect'
  | 'ChannelSelect'
  | 'ModalSubmit'
>;

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Array<unknown>
      ? T[P]
      : DeepPartial<T[P]>
    : T[P];
};

type CommandData<Type extends CommandType = CommandType> =
  Type extends typeof CommandType.ChatInput
    ? SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder
    : Type extends typeof CommandType.PrimaryEntryPoint
      ? SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder
      : Type extends typeof CommandType.UserContextMenu
        ? ContextMenuCommandBuilder
        : Type extends typeof CommandType.MessageContextMenu
          ? ContextMenuCommandBuilder
          : Type extends typeof CommandType.Button
            ? ButtonBuilder
            : Type extends typeof CommandType.StringSelect
              ? StringSelectMenuBuilder
              : Type extends typeof CommandType.UserSelect
                ? UserSelectMenuBuilder
                : Type extends typeof CommandType.RoleSelect
                  ? RoleSelectMenuBuilder
                  : Type extends typeof CommandType.MentionableSelect
                    ? MentionableSelectMenuBuilder
                    : Type extends typeof CommandType.ChannelSelect
                      ? ChannelSelectMenuBuilder
                      : Type extends typeof CommandType.ModalSubmit
                        ? ModalBuilder
                        : never;

type CommandInteraction<
  Type extends CommandType = CommandType,
  Cached extends CacheType = CacheType,
> = Type extends typeof CommandType.UserContextMenu
  ? UserContextMenuCommandInteraction<Cached>
  : Type extends typeof CommandType.MessageContextMenu
    ? MessageContextMenuCommandInteraction<Cached>
    : Type extends typeof CommandType.ChatInput
      ? ChatInputCommandInteraction<Cached>
      : Type extends typeof CommandType.PrimaryEntryPoint
        ? ChatInputCommandInteraction<Cached>
        : Type extends typeof CommandType.Button
          ? ButtonInteraction<Cached>
          : Type extends typeof CommandType.StringSelect
            ? StringSelectMenuInteraction<Cached>
            : Type extends typeof CommandType.UserSelect
              ? UserSelectMenuInteraction<Cached>
              : Type extends typeof CommandType.RoleSelect
                ? RoleSelectMenuInteraction<Cached>
                : Type extends typeof CommandType.MentionableSelect
                  ? MentionableSelectMenuInteraction<Cached>
                  : Type extends typeof CommandType.ChannelSelect
                    ? ChannelSelectMenuInteraction<Cached>
                    : Type extends typeof CommandType.ModalSubmit
                      ? ModalSubmitInteraction<Cached>
                      : never;

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
  type APICommandTypeValue,
  type DeepPartial,
  type CommandData,
  type CommandInteraction,
  type CommandRunFunction,
  type CacheTypeResolver,
  type AvailableGuildInteraction,
  type DMInteraction,
};
