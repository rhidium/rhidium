import {
  CommandType,
  type CacheTypeResolver,
  type CommandData,
  type CommandInteraction,
  type CommandRunFunction,
  type CommandTypeValue,
} from './types';
import debug, { type Debugger } from '@client/debug';
import {
  ApplicationIntegrationType,
  ContextMenuCommandBuilder,
  InteractionContextType,
  MessageFlags,
  RepliableInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import commandDefaults from './defaults';
import type {
  CommandControllerOptions,
  CommandEnabledOptions,
  CommandInteractionOptions,
  CommandOptions,
  CommandPermissionOptions,
  PartialCommandOptions,
  RequiredCommandOptions,
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
  Type extends CommandTypeValue,
  GuildOnly extends boolean,
  RefuseUncached extends boolean,
  ReturnType,
> implements
    RequiredCommandOptions<Type, GuildOnly, RefuseUncached, ReturnType>
{
  public readonly id: string;
  public readonly type: Type;
  public readonly data: CommandData<Type>;
  public readonly run: CommandRunFunction<
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
    return `Command<${this.type}, ${this.data.name}>`;
  }

  protected readonly debug: Debugger;

  protected constructor(
    config: RequiredCommandOptions<Type, GuildOnly, RefuseUncached, ReturnType>,
    public readonly options: PartialCommandOptions<GuildOnly, RefuseUncached> &
      CommandControllerOptions<Type, GuildOnly, RefuseUncached, ReturnType>,
  ) {
    this.id = config.data.name;
    this.type = config.type;
    this.data = CommandBase.dataResolver(this.type, config.data);
    this.run = config.run.bind(this);

    this.debug = debug.commands[this.type].extend(this.id);

    this.permissions = Object.assign(
      Command.defaults.permissions,
      options.permissions,
    );
    this.enabled = Object.assign(Command.defaults.enabled, options.enabled);
    this.interactions = Object.assign(
      Command.defaults.interactions,
      options.interactions,
    ) as CommandInteractionOptions<RefuseUncached>;
    this.throttle = Object.assign(Command.defaults.throttle, options.throttle);

    const parseControllers = (): Record<
      string,
      CommandController<
        ReturnType,
        CommandInteraction<Type, CacheTypeResolver<GuildOnly, RefuseUncached>>
      >
    > => {
      const controllers = this.options.controllers ?? {};

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

  public static readonly getContexts = (
    command: AnyCommand,
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
    command: AnyCommand,
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

  public static readonly buildApiCommand = (command: AnyCommand) => {
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

  protected static readonly dataResolver = <Type extends CommandTypeValue>(
    type: Type,
    data:
      | CommandData<Type>
      | ((builder: CommandData<Type>) => CommandData<Type>),
  ): CommandData<Type> =>
    typeof data === 'function'
      ? data(
          (type === CommandType.ChatInput ||
          type === CommandType.PrimaryEntryPoint
            ? new SlashCommandBuilder()
            : new ContextMenuCommandBuilder()) as CommandData<Type>,
        )
      : data;

  protected static readonly handlePermissions = async <
    Type extends CommandTypeValue,
    GuildOnly extends boolean,
    RefuseUncached extends boolean,
    ReturnType,
  >(
    command: CommandBase<Type, GuildOnly, RefuseUncached, ReturnType>,
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
    Type extends CommandTypeValue,
    GuildOnly extends boolean,
    RefuseUncached extends boolean,
    ReturnType,
  >(
    command: CommandBase<Type, GuildOnly, RefuseUncached, ReturnType>,
    interaction: CommandInteraction,
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
}

class Command<
  Type extends CommandTypeValue = CommandTypeValue,
  GuildOnly extends boolean = false,
  RefuseUncached extends boolean = false,
  ReturnType = void,
> extends CommandBase<Type, GuildOnly, RefuseUncached, ReturnType> {
  public constructor({
    type,
    data,
    run,
    ...options
  }: CommandOptions<Type, GuildOnly, RefuseUncached, ReturnType> &
    CommandControllerOptions<Type, GuildOnly, RefuseUncached, ReturnType>) {
    super(
      {
        type,
        data,
        run,
      },
      options,
    );
  }
}

type AnyCommand = Command<CommandTypeValue, boolean, boolean, unknown>;

export { Command, CommandBase, type AnyCommand };
