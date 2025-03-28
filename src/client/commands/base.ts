import {
  CommandType,
  type APICommandTypeValue,
  type CacheTypeResolver,
  type CommandData,
  type CommandInteraction,
  type CommandRunFunction,
} from './types';
import debug, { type Debugger } from '@client/debug';
import {
  ApplicationIntegrationType,
  ButtonBuilder,
  ChannelSelectMenuBuilder,
  ContextMenuCommandBuilder,
  InteractionContextType,
  InteractionType,
  MentionableSelectMenuBuilder,
  MessageFlags,
  ModalBuilder,
  RepliableInteraction,
  RoleSelectMenuBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';
import commandDefaults from './defaults';
import type {
  CommandEnabledOptions,
  CommandInteractionOptions,
  CommandOptions,
  CommandPermissionOptions,
} from './options';
import { CommandThrottleOptions } from './throttle';
import { Permissions } from '@client/permissions';
import {
  InteractionUtils,
  WithResponseContent,
} from '@client/utils/interaction';
import { CommandController } from './controllers';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

class CommandBase<
  Type extends CommandType,
  GuildOnly extends boolean,
  RefuseUncached extends boolean,
  ReturnType,
> {
  public readonly id: string;
  public readonly type: Type;
  public readonly data: CommandData<Type>;
  public readonly run: null | CommandRunFunction<
    ReturnType,
    CommandInteraction<Type, CacheTypeResolver<GuildOnly, RefuseUncached>>
  >;

  public readonly permissions: CommandPermissionOptions;
  public readonly enabled: CommandEnabledOptions<GuildOnly>;
  public readonly interactions: CommandInteractionOptions<RefuseUncached>;
  public readonly throttle: CommandThrottleOptions;
  public readonly controllers: Record<
    string,
    CommandController<
      ReturnType,
      CommandInteraction<Type, CacheTypeResolver<GuildOnly, RefuseUncached>>
    >
  >;

  public toString(): string {
    return `Command<${this.type}, ${this.id}>`;
  }

  protected readonly debug: Debugger;

  protected constructor(
    public readonly options: CommandOptions<
      Type,
      GuildOnly,
      RefuseUncached,
      ReturnType
    >,
  ) {
    const [id, data] = CommandBase.dataResolver(options.type, options.data);

    this.id = id;
    this.type = options.type;
    this.data = data;
    this.run =
      'run' in options && typeof options.run !== 'undefined'
        ? options.run.bind(this)
        : null;

    this.debug = debug.commands[this.type].extend(this.id);

    this.permissions = Object.assign(
      {},
      Command.defaults.permissions,
      options.permissions,
    );
    this.enabled = Object.assign({}, Command.defaults.enabled, options.enabled);
    this.interactions = Object.assign(
      {},
      Command.defaults.interactions,
      options.interactions,
    ) as CommandInteractionOptions<RefuseUncached>;
    this.throttle = Object.assign(
      {},
      Command.defaults.throttle,
      options.throttle,
    );

    const parseControllers = (): Record<
      string,
      CommandController<
        ReturnType,
        CommandInteraction<Type, CacheTypeResolver<GuildOnly, RefuseUncached>>
      >
    > => {
      const controllers = options.controllers ?? {};

      return Object.fromEntries(
        Object.entries(controllers)
          .filter(
            ([, controller]) =>
              typeof controller === 'function' ||
              typeof controller === 'object',
          )
          .flatMap(([name, controller]) =>
            typeof controller === 'function'
              ? [[name, controller.bind(this)]]
              : Object.entries(controller).map(([subname, subcontroller]) => [
                  `${name}.${subname}`,
                  subcontroller.bind(this),
                ]),
          ),
      );
    };

    // Assign controllers to the class instance
    this.controllers = parseControllers();
  }

  protected static readonly defaults = commandDefaults;

  protected static readonly deferReply = async (
    interaction: CommandInteraction,
    ephemeral: boolean,
  ) => {
    if (interaction.deferred || interaction.replied) return;

    await interaction.deferReply({
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  };

  public static readonly isApiCommand = (
    command: AnyCommand,
  ): command is APICommand =>
    command.type === CommandType.ChatInput ||
    command.type === CommandType.UserContextMenu ||
    command.type === CommandType.MessageContextMenu ||
    command.type === CommandType.PrimaryEntryPoint;

  public static readonly isComponentCommand = (
    command: AnyCommand,
  ): command is APICommand => !CommandBase.isApiCommand(command);

  public static readonly isEnabled = (command: AnyCommand): boolean => {
    if (command.enabled.global === false) {
      return false;
    }

    return true;
  };

  public static readonly resolveDiscordType = (
    type: CommandType,
  ): InteractionType => {
    switch (type) {
      case CommandType.ChatInput:
        return InteractionType.ApplicationCommand;
      case CommandType.UserContextMenu:
        return InteractionType.ApplicationCommand;
      case CommandType.MessageContextMenu:
        return InteractionType.ApplicationCommand;
      case CommandType.PrimaryEntryPoint:
        return InteractionType.ApplicationCommand;
      case CommandType.Button:
        return InteractionType.MessageComponent;
      case CommandType.StringSelect:
        return InteractionType.MessageComponent;
      case CommandType.UserSelect:
        return InteractionType.MessageComponent;
      case CommandType.RoleSelect:
        return InteractionType.MessageComponent;
      case CommandType.MentionableSelect:
        return InteractionType.MessageComponent;
      case CommandType.ChannelSelect:
        return InteractionType.MessageComponent;
      case CommandType.ModalSubmit:
        return InteractionType.ModalSubmit;
      default:
        throw new Error(
          `Unknown command type ${type}, cannot resolve Discord interaction type`,
        );
    }
  };

  /**
   * Reply to an interaction with a message, dynamically resolving
   * which reply function to use depending on wether or not the
   * interaction has been acknowledged. `ephemeral` is resolved from
   * `this#isEphemeral` if not overriden.
   *
   * Please note that using {@link MessageFlags} in the `content` is not supported
   * with a dynamic function like this. If you need specific flags, use `reply`,
   * `editReply`, `followUp`, etc. directly, instead of using this convenience method.
   */
  public readonly reply = <
    I extends RepliableInteraction,
    WithResponse extends boolean = false,
  >(
    interaction: I,
    content: WithResponseContent<WithResponse>,
    withResponse?: WithResponse,
    ephemeral?: boolean,
  ) =>
    InteractionUtils.replyDynamic(
      interaction,
      content,
      ephemeral ?? this.interactions.replyEphemeral,
      withResponse,
    );

  public readonly children: AnyCommand[] = [];
  public readonly extend = <
    T extends CommandType,
    GO extends boolean = GuildOnly,
    RU extends boolean = RefuseUncached,
    RT = void,
  >(
    options: CommandOptions<T, GO, RU, RT>,
  ): Command<T, GO, RU, RT> => {
    const command = new Command<T, GO, RU, RT>({
      ...{
        ...this.options,
        data: undefined,
        type: undefined,
        controllers: undefined,
        run: undefined,
      },
      ...options,
    } as CommandOptions<T, GO, RU, RT>);

    this.children.push(command as AnyCommand);

    return command;
  };

  public static readonly getContexts = (
    command: APICommand,
  ): InteractionContextType[] => {
    if (!command.data.contexts?.length) {
      const contexts: InteractionContextType[] = [];

      if (command.enabled.guildOnly === true) {
        contexts.push(InteractionContextType.Guild);
      } else {
        if ('dm' in command.enabled && command.enabled.dm === true) {
          contexts.push(InteractionContextType.BotDM);
        }
        if (
          'privateChannel' in command.enabled &&
          command.enabled.privateChannel === true
        ) {
          contexts.push(InteractionContextType.PrivateChannel);
        }
        if (
          ('guilds' in command.enabled && command.enabled.guilds === true) ||
          (Array.isArray(command.enabled.guilds) &&
            command.enabled.guilds.length > 0)
        ) {
          contexts.push(InteractionContextType.Guild);
        }
      }

      return contexts;
    }

    return command.data.contexts;
  };

  public static readonly getIntegrationTypes = (
    command: APICommand,
    contexts: InteractionContextType[],
  ): ApplicationIntegrationType[] => {
    if (!command.data.integration_types?.length) {
      const integrationTypes: ApplicationIntegrationType[] = [];

      if (contexts.includes(InteractionContextType.Guild)) {
        integrationTypes.push(ApplicationIntegrationType.GuildInstall);
      }

      if (contexts.includes(InteractionContextType.BotDM)) {
        integrationTypes.push(ApplicationIntegrationType.UserInstall);
      }

      return integrationTypes;
    }

    return command.data.integration_types;
  };

  public static readonly buildApiCommand = (
    command: APICommand,
  ): AnyCommand => {
    const contexts = CommandBase.getContexts(command);
    const integrationTypes = CommandBase.getIntegrationTypes(command, contexts);

    command.data.setContexts(contexts);
    command.data.setIntegrationTypes(integrationTypes);

    if (typeof command.data.default_member_permissions === 'undefined') {
      command.data.setDefaultMemberPermissions(
        command.permissions.defaultMemberPermissions,
      );
    }

    if (command.data instanceof SlashCommandBuilder) {
      if (typeof command.data.nsfw === 'undefined') {
        command.data.setNSFW(command.enabled.nsfw);
      }
    }

    return command;
  };

  protected static readonly dataResolver = <Type extends CommandType>(
    type: Type,
    data:
      | CommandData<Type>
      | ((builder: CommandData<Type>) => CommandData<Type>),
  ): [string, CommandData<Type>] => {
    let resolved: CommandData<Type>;

    if (typeof data !== 'function') {
      resolved = data;
    } else {
      switch (type) {
        case CommandType.ChatInput:
        case CommandType.PrimaryEntryPoint:
          resolved = data(new SlashCommandBuilder() as CommandData<Type>);
          break;
        case CommandType.Button:
          resolved = data(new ButtonBuilder() as CommandData<Type>);
          break;
        case CommandType.StringSelect:
          resolved = data(new StringSelectMenuBuilder() as CommandData<Type>);
          break;
        case CommandType.UserSelect:
          resolved = data(new UserSelectMenuBuilder() as CommandData<Type>);
          break;
        case CommandType.RoleSelect:
          resolved = data(new RoleSelectMenuBuilder() as CommandData<Type>);
          break;
        case CommandType.MentionableSelect:
          resolved = data(
            new MentionableSelectMenuBuilder() as CommandData<Type>,
          );
          break;
        case CommandType.ChannelSelect:
          resolved = data(new ChannelSelectMenuBuilder() as CommandData<Type>);
          break;
        case CommandType.ModalSubmit:
          resolved = data(new ModalBuilder() as CommandData<Type>);
          break;
        case CommandType.UserContextMenu:
        case CommandType.MessageContextMenu:
          resolved = data(new ContextMenuCommandBuilder() as CommandData<Type>);
          break;
      }
    }

    const id: string | null =
      'name' in resolved
        ? resolved.name
        : 'custom_id' in resolved.data &&
            typeof resolved.data.custom_id === 'string'
          ? resolved.data.custom_id
          : null;

    if (id === null) {
      throw new Error(
        `Unable to resolve any unique identifier for command, please provide a name or customId: ${JSON.stringify(
          resolved,
          null,
          2,
        )}`,
      );
    }

    return [id, resolved];
  };

  protected static readonly handlePermissions = async <
    Type extends CommandType,
    GuildOnly extends boolean,
    RefuseUncached extends boolean,
    ReturnType,
  >(
    command: Command<Type, GuildOnly, RefuseUncached, ReturnType>,
    interaction: CommandInteraction,
  ): Promise<true | string> => {
    command.debug('Handling permissions');

    if (command.permissions.level > 0) {
      const memberPermLevel = await Permissions.resolveForMember(
        interaction.member,
        interaction.guild,
      );

      if (memberPermLevel < command.permissions.level) {
        return 'Your permission level is too low to use this command';
      }
    }

    if (command.permissions.client.length > 0 && interaction.inGuild()) {
      if (!interaction.guild || !interaction.guild.members.me) {
        return 'I am not in this server, or added to the server without the `bot` scope';
      }

      const me = interaction.guild.members.me;

      if (!me.permissions.has(command.permissions.client)) {
        const missing = me.permissions.missing(
          command.permissions.client,
          true,
        );

        return `I do not have the required permissions to use this command: ${Permissions.displayPermissions(
          missing,
        )}`;
      }
    }

    if (command.permissions.user.length > 0) {
      if (!interaction.inCachedGuild()) {
        if (interaction.inGuild()) {
          return 'User permissions are not available in uncached guilds';
        }
      } else if (interaction.channel) {
        const missing = interaction.channel
          .permissionsFor(interaction.user.id, true)
          ?.missing(command.permissions.user);

        if (missing?.length) {
          return `You do not have the required permissions to use this command: ${Permissions.displayPermissions(
            missing,
          )}`;
        }
      }
    }

    if (
      command.permissions.whitelist.guilds.length > 0 &&
      interaction.inGuild()
    ) {
      if (!command.permissions.whitelist.guilds.includes(interaction.guildId)) {
        return 'That command is not available in this server';
      }
    }

    if (
      command.permissions.whitelist.channels.length > 0 &&
      interaction.inGuild()
    ) {
      if (
        !interaction.channelId ||
        !command.permissions.whitelist.channels.includes(interaction.channelId)
      ) {
        return 'That command is not available in this channel';
      }
    }

    if (
      command.permissions.whitelist.roles.length > 0 &&
      interaction.inGuild()
    ) {
      if (
        isStringArray(interaction.member.roles)
          ? !interaction.member.roles.some((roleId) =>
              command.permissions.whitelist.roles.includes(roleId),
            )
          : !interaction.member.roles.cache.some((role) =>
              command.permissions.whitelist.roles.includes(role.id),
            )
      ) {
        return 'You do not have the required role(s) to use this command';
      }
    }

    if (command.permissions.whitelist.users.length > 0) {
      if (!command.permissions.whitelist.users.includes(interaction.user.id)) {
        return 'You are not authorized to use this command';
      }
    }

    if (
      command.permissions.whitelist.categories.length > 0 &&
      interaction.inGuild()
    ) {
      if (
        !interaction.channel?.parentId ||
        !command.permissions.whitelist.categories.includes(
          interaction.channel.parentId,
        )
      ) {
        return 'That command is not available in this (channel) category';
      }
    }

    return true;
  };

  public static readonly handleInteraction = async <
    Type extends CommandType,
    GuildOnly extends boolean,
    RefuseUncached extends boolean,
    ReturnType,
  >(
    command: Command<Type, GuildOnly, RefuseUncached, ReturnType>,
    interaction: CommandInteraction<CommandType>,
  ): Promise<
    | string
    | CommandInteraction<Type, CacheTypeResolver<GuildOnly, RefuseUncached>>
  > => {
    command.debug('Handling interaction');

    if (command.enabled.global === false) {
      command.debug('Disabled globally, refusing interaction');
      return 'This command is currently disabled';
    }

    const permissions = await CommandBase.handlePermissions(
      command,
      interaction,
    );

    if (permissions !== true) {
      command.debug('Refusing interaction due to permissions:', permissions);
      return permissions;
    }

    if (command.enabled.guildOnly) {
      if (!interaction.inGuild()) {
        command.debug('Refusing guild-only interaction in DMs');
        return 'This command is only available in servers';
      }

      if (command.interactions.refuseUncached && !interaction.inCachedGuild()) {
        command.debug('Refusing uncached interaction');
        return 'This command is not available in uncached servers';
      }
    }

    if (interaction.inGuild()) {
      if (
        command.enabled.nsfw &&
        interaction.channel &&
        (interaction.channel.isThread() || !interaction.channel.nsfw)
      ) {
        command.debug('Refusing interaction in non-NSFW channel');
        return 'This command is only available in NSFW channels';
      }

      if (
        typeof command.enabled.guilds !== 'boolean' &&
        command.enabled.guilds.length > 0 &&
        !command.enabled.guilds.includes(interaction.guildId)
      ) {
        command.debug('Refusing interaction in unauthorized guild');
        return 'This command is not available in this server';
      }
    } else {
      if (
        ('dm' in command.enabled && command.enabled.dm === false) ||
        ('privateChannel' in command.enabled &&
          command.enabled.privateChannel === false)
      ) {
        command.debug('Refusing DM/Private interaction');
        return 'This command is not available in DMs';
      }
    }

    if (command.interactions.deferReply) {
      await CommandBase.deferReply(
        interaction,
        command.interactions.replyEphemeral,
      );
    }

    return interaction as CommandInteraction<
      Type,
      CacheTypeResolver<GuildOnly, RefuseUncached>
    >;
  };

  public static readonly runFunctionResolver = <
    Type extends CommandType,
    GuildOnly extends boolean,
    RefuseUncached extends boolean,
    ReturnType,
  >(
    command: Command<Type, GuildOnly, RefuseUncached, ReturnType>,
    interaction: CommandInteraction<
      Type,
      CacheTypeResolver<GuildOnly, RefuseUncached>
    >,
  ): null | CommandRunFunction<
    ReturnType,
    CommandInteraction<Type, CacheTypeResolver<GuildOnly, RefuseUncached>>
  > => {
    let fn = command.run;
    const isChatInputCommand = interaction.isChatInputCommand();
    const subcommand = isChatInputCommand
      ? interaction.options.getSubcommand(false)
      : null;
    const subcommandGroup = isChatInputCommand
      ? interaction.options.getSubcommandGroup(false)
      : null;
    const controller =
      subcommandGroup && subcommand
        ? command.controllers[`${subcommandGroup}.${subcommand}`]
        : subcommandGroup || subcommand
          ? command.controllers[(subcommandGroup || subcommand)!]
          : null;

    if (
      (subcommand || subcommandGroup) &&
      Object.keys(command.controllers).length > 0 &&
      typeof controller === 'function'
    ) {
      fn = controller;
    }

    if (fn === null) {
      return null;
    }

    return fn as CommandRunFunction<
      ReturnType,
      CommandInteraction<Type, CacheTypeResolver<GuildOnly, RefuseUncached>>
    >;
  };
}

class Command<
  Type extends CommandType = CommandType,
  GuildOnly extends boolean = boolean,
  RefuseUncached extends boolean = boolean,
  ReturnType = void,
> extends CommandBase<Type, GuildOnly, RefuseUncached, ReturnType> {
  public constructor(
    options: CommandOptions<Type, GuildOnly, RefuseUncached, ReturnType>,
  ) {
    super(options);
  }
}

type AnyTypedCommand = {
  [Type in CommandType]: Command<Type, boolean, boolean, unknown>;
};

type AnyCommand<Type extends CommandType = CommandType> = AnyTypedCommand[Type];

type APICommand<Type extends APICommandTypeValue = APICommandTypeValue> =
  AnyTypedCommand[Type];

export { Command, CommandBase, type AnyCommand, type APICommand };
