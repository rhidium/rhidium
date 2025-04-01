import { PermLevel } from '@core/commands/permissions';
import {
  ChatInputCommandInteraction,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  InteractionContextType,
  PermissionResolvable,
  Permissions,
} from 'discord.js';
import { RequiredResourceOptions } from './required-resources';
import {
  CacheTypeResolver,
  CommandData,
  CommandInteraction,
  CommandRunFunction,
  CommandType,
  DeepPartial,
} from './types';
import { CommandThrottleOptions } from './throttle';
import { CommandController } from './controllers';

type CommandInteractionOptions<RefuseUncached extends boolean> = {
  /**
   * Wether or not this command should refuse to run if the data for the interaction is not cached.
   * Only has an effect for guild interactions.
   * - If `true`, the command will refuse to run if the data for the interaction is not cached, and
   *   a generic error message will be sent to the user. The type for the interaction will be further
   *   narrowed down to a "cached" interaction.
   * - If `false`, the command will run regardless of the cache state.
   * @default false
   */
  refuseUncached: RefuseUncached;
  /**
   * Wether or not replies to this command should be ephemeral.
   * - If `true`, replies will only be visible to the user who invoked the command.
   * - If `false`, replies will be visible to everyone in the channel.
   * @default false
   */
  replyEphemeral: boolean;
  /**
   * Wether or not the reply to this command should be deferred.
   * - If `true`, replies to this command will be deferred, and the command will have 15 minutes to send/update
   *   the (deferred) reply, or send a follow-up message.
   * - If `false`, replies will not be deferred, and the command will have 3 seconds to send the reply.
   * @default false
   */
  deferReply: boolean;
};

type CommandEnabledOptions<GuildOnly extends boolean> = {
  /**
   * Wether or not this command is enabled globally. If `false`, all other options are ignored - allowing
   * you to "temporarily" disable a command without removing it from the codebase or changing any other options.
   * @default true
   */
  global: boolean;
  /**
   * Wether or not this command is considered "Not Safe For Work", and therefor not allowed/made available in
   * channels thats are **not** explicitely marked as NSFW.
   * - If `true`, the command will only be available in NSFW channels.
   * - If `false`, the command will be available in all channels.
   * @default false
   */
  nsfw: boolean;
} & (
  | {
      /**
       * Wether or not this command is **ONLY** enabled in the {@link InteractionContextType.Guild} context.
       * All of the other context options are ignored if this is set to `true`, and the `interaction` for the command
       * will be narrowed down to a "guild" interaction.
       */
      guildOnly: GuildOnly;
      /**
       * An array of guild IDs where this command is enabled.
       * - If `undefined`, the command is enabled in all guilds.
       * - If an empty array, the command is disabled in all guilds.
       * - If an array of strings with length, the command is enabled in the guilds with the specified IDs.
       *
       * **Default:**
       * - If `process.env.NODE_ENV` is `production`, this defaults to `undefined`.
       * - If `process.env.NODE_ENV` is not `production`, this defaults to `[appConfig.client.development_server_id]`.
       */
      guilds: string[];
    }
  | {
      guildOnly: false; // Note: `guildOnly` is not allowed when using specific context options.

      /**
       * Wether or not this command is enabled in the {@link InteractionContextType.Guild} context.
       * - If true, the command will be enabled in all guilds.
       * - If false, the command will not be available in the Guild context, and therefor be disabled in all guilds.
       * - If an array of strings with length, the command will be only enabled in the guilds with the specified IDs.
       *
       * **Default:**
       * - If `process.env.NODE_ENV` is `production`, this defaults to `true`.
       * - If `process.env.NODE_ENV` is not `production`, this defaults to `[appConfig.client.development_server_id]`.
       */
      guilds: boolean | string[];
      /**
       * Wether or not this command is enabled in the {@link InteractionContextType.BotDM} context (aka DMs with the app's bot user).
       * - Please note that a {@link https://discord.com/developers/docs/tutorials/developing-a-user-installable-app User Install} is required before users are able to interact with the bot in DMs.
       * @default false
       */
      dm: boolean;
      /**
       * Wether or not this command is enabled in the {@link InteractionContextType.PrivateChannel} context (aka Group DMs and DMs other than the app's bot user)
       * - Please note that a {@link https://discord.com/developers/docs/tutorials/developing-a-user-installable-app User Install} is required before users are able to interact with the bot in DMs.
       * @default false
       */
      privateChannel: boolean;
    }
);

type CommandPermissionOptions = {
  level: PermLevel;
  client: PermissionResolvable[];
  user: PermissionResolvable[];
  whitelist: RequiredResourceOptions;
  defaultMemberPermissions: Permissions | bigint | number | null | undefined;
};

type LocalRequiredCommandOptionsBase<Type extends CommandType = CommandType> = {
  type: Type;
  data: CommandData<Type> | ((builder: CommandData<Type>) => CommandData<Type>);
};

type PartialCommandOptions<
  GuildOnly extends boolean,
  RefuseUncached extends boolean,
> = DeepPartial<{
  category: string;
  enabled: CommandEnabledOptions<GuildOnly>;
  permissions: CommandPermissionOptions;
  interactions: CommandInteractionOptions<RefuseUncached>;
  throttle: CommandThrottleOptions;
}>;

type CommandRunOptions<
  Type extends CommandType = CommandType,
  GuildOnly extends boolean = false,
  RefuseUncached extends boolean = false,
  ReturnType = void,
> = {
  run: CommandRunFunction<
    ReturnType,
    CommandInteraction<Type, CacheTypeResolver<GuildOnly, RefuseUncached>>
  >;
  controllers?: never;
};

type CommandControllerOptions<
  Type extends CommandType = CommandType,
  GuildOnly extends boolean = false,
  RefuseUncached extends boolean = false,
  ReturnType = void,
> = {
  run?: never;
  controllers: Record<
    string,
    | CommandController<
        ReturnType,
        CommandInteraction<Type, CacheTypeResolver<GuildOnly, RefuseUncached>>
      >
    | Record<
        string,
        CommandController<
          ReturnType,
          CommandInteraction<Type, CacheTypeResolver<GuildOnly, RefuseUncached>>
        >
      >
  >;
};

type AutoCompleteResolver<
  GuildOnly extends boolean,
  RefuseUncached extends boolean,
  ResolveType extends NonNullable<unknown> | null = null,
> = (
  interaction: ChatInputCommandInteraction<
    CacheTypeResolver<GuildOnly, RefuseUncached>
  >,
  options?: {
    optionName?: string;
    optionRequired?: boolean;
  },
) => ResolveType;

type AutoCompleteCommandOptions<
  Type extends CommandType,
  GuildOnly extends boolean,
  RefuseUncached extends boolean,
  ResolveType extends NonNullable<unknown> | null = null,
> = Type extends CommandType.AutoComplete
  ? {
      resolver: AutoCompleteResolver<GuildOnly, RefuseUncached, ResolveType>;
    }
  : {};

type CommandOptions<
  Type extends CommandType,
  GuildOnly extends boolean,
  RefuseUncached extends boolean,
  ReturnType,
  ResolveType extends NonNullable<unknown> | null = null,
> = PartialCommandOptions<GuildOnly, RefuseUncached> &
  (
    | (CommandRunOptions<Type, GuildOnly, RefuseUncached, ReturnType> &
        LocalRequiredCommandOptionsBase<Type>)
    | (CommandControllerOptions<Type, GuildOnly, RefuseUncached, ReturnType> &
        LocalRequiredCommandOptionsBase<Type>)
  ) &
  AutoCompleteCommandOptions<Type, GuildOnly, RefuseUncached, ResolveType>;

export {
  type CommandInteractionOptions,
  type CommandEnabledOptions,
  type CommandPermissionOptions,
  type PartialCommandOptions,
  type CommandRunOptions,
  type CommandControllerOptions,
  type AutoCompleteResolver,
  type AutoCompleteCommandOptions,
  type CommandOptions,
};
