import {
  CommandType,
  type NonAPICommandTypeValue,
  type APICommandTypeValue,
  type CacheTypeResolver,
  type CommandData,
  type CommandInteraction,
  type CommandRunFunction,
} from './types';
import { debug, Logger, type Debugger } from '@core/logger';
import {
  ApplicationCommandOptionBase,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonBuilder,
  type CacheType,
  ChannelSelectMenuBuilder,
  ContextMenuCommandBuilder,
  type Interaction,
  InteractionContextType,
  InteractionType,
  MentionableSelectMenuBuilder,
  MessageFlags,
  ModalBuilder,
  type RepliableInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  type RESTPostAPIContextMenuApplicationCommandsJSONBody,
  RoleSelectMenuBuilder,
  SlashCommandBuilder,
  type SlashCommandOptionsOnlyBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';
import commandDefaults from './defaults';
import type {
  AutoCompleteResolver,
  CommandEnabledOptions,
  CommandInteractionOptions,
  CommandOptions,
  CommandPermissionOptions,
  PartialCommandOptions,
} from './options';
import { type CommandThrottleOptions } from './throttle';
import { Permissions, PermLevel } from '@core/commands/permissions';
import {
  InteractionUtils,
  ResponseContent,
  type WithResponseContent,
} from '@core/utils';
import { type CommandController } from './controllers';
import { I18n, locales } from '@core/i18n';
import { InteractionConstants } from '@core/constants';
import { Database } from '@core/database';
import type { LocalizedLabelKey } from '@core/i18n/types';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

type ThrottleConsumerResult = {
  ok: boolean;
  /** The minimal time the user has to wait before being able to use the command again */
  expiresAt: number;
};

type ThrottleConsumer = (
  throttle: Readonly<CommandThrottleOptions>,
) => ThrottleConsumerResult | Promise<ThrottleConsumerResult>;

class CommandBase<
  Type extends CommandType,
  GuildOnly extends boolean,
  RefuseUncached extends boolean,
  ReturnType,
  ResolveType extends NonNullable<unknown> | null,
> {
  public readonly id: string;
  public readonly idWithoutPrefix: string;
  public readonly category: string;
  public readonly type: Type;
  public readonly data: CommandData<Type>;
  private readonly run: null | CommandRunFunction<
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
    return `Command<${this.id}>`;
  }

  protected readonly debug: Debugger;

  protected constructor(
    private readonly options: CommandOptions<
      Type,
      GuildOnly,
      RefuseUncached,
      ReturnType,
      ResolveType
    >,
  ) {
    const data = CommandBase.dataResolver(options.type, options.data);
    const id: string | null | undefined =
      'name' in data
        ? data.name
        : 'custom_id' in data.data && typeof data.data.custom_id === 'string'
          ? data.data.custom_id
          : null;

    if (id === null || typeof id === 'undefined') {
      let json;
      try {
        json = JSON.stringify(data, null, 2);
      } catch (err) {
        throw new Error(
          `Unable to convert command data to JSON: ${data.toString()} - ${err}`,
        );
      }
      throw new Error(
        `Unable to resolve any unique identifier for command, please provide a name or customId: ${json}`,
      );
    }

    this.type = options.type;
    this.id = `${this.type === CommandType.ChatInputPlain ? CommandType.ChatInput : this.type}/${id}`;
    this.idWithoutPrefix = this.id.split('/').slice(1).join('/');
    this.data = data;
    this.category = options?.category ?? 'Uncategorized';
    this.run =
      'run' in options && typeof options.run !== 'undefined'
        ? options.run.bind(this)
        : null;

    this.debug = debug.commands[this.type].extend(this.idWithoutPrefix);
    this.resolver = (
      this.type === CommandType.AutoComplete && 'resolver' in options
        ? options.resolver
        : null
    ) as Type extends CommandType.AutoComplete
      ? AutoCompleteResolver<GuildOnly, RefuseUncached, ResolveType>
      : null;

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

  public readonly resolver: Type extends CommandType.AutoComplete
    ? AutoCompleteResolver<GuildOnly, RefuseUncached, ResolveType>
    : null;

  protected static readonly defaults = commandDefaults;

  protected static readonly deferReply = async <
    Interaction extends RepliableInteraction,
  >(
    interaction: Interaction,
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
    command.type === CommandType.ChatInputPlain ||
    command.type === CommandType.UserContextMenu ||
    command.type === CommandType.MessageContextMenu ||
    command.type === CommandType.PrimaryEntryPoint;

  public static readonly isNonApiCommand = (
    command: AnyCommand,
  ): command is NonAPICommand => !CommandBase.isApiCommand(command);

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
      case CommandType.ChatInputPlain:
        return InteractionType.ApplicationCommand;
      case CommandType.UserContextMenu:
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
      case CommandType.AutoComplete:
        return InteractionType.ApplicationCommandAutocomplete;
      default:
        throw new Error(
          `Unknown command type ${type}, cannot resolve Discord interaction type`,
        );
    }
  };

  public static readonly commandIdentifierFor = <
    I extends Interaction<CacheType>,
  >(
    interaction: I,
  ): string => {
    const prefix = interaction.isAutocomplete()
      ? CommandType.AutoComplete
      : interaction.isButton()
        ? CommandType.Button
        : interaction.isStringSelectMenu()
          ? CommandType.StringSelect
          : interaction.isUserSelectMenu()
            ? CommandType.UserSelect
            : interaction.isRoleSelectMenu()
              ? CommandType.RoleSelect
              : interaction.isMentionableSelectMenu()
                ? CommandType.MentionableSelect
                : interaction.isChannelSelectMenu()
                  ? CommandType.ChannelSelect
                  : interaction.isModalSubmit()
                    ? CommandType.ModalSubmit
                    : interaction.isMessageContextMenuCommand()
                      ? CommandType.MessageContextMenu
                      : interaction.isUserContextMenuCommand()
                        ? CommandType.UserContextMenu
                        : CommandType.ChatInput;

    const base =
      prefix +
      '/' +
      (interaction.isAutocomplete()
        ? interaction.options.getFocused(true).name
        : 'customId' in interaction
          ? interaction.customId
          : interaction.commandName);

    if (
      base.indexOf(InteractionConstants.COMPONENT_HANDLER_IDENTIFIER) === -1
    ) {
      return base;
    }

    const [withoutData] = base.split(
      InteractionConstants.COMPONENT_HANDLER_IDENTIFIER,
    );

    return withoutData ?? base;
  };

  /**
   * Reply to an interaction with a message, dynamically resolving
   * which reply function to use depending on wether or not the
   * interaction has been acknowledged. `ephemeral` is resolved from
   * `this#isEphemeral` if not overridden.
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

  public readonly response = <WithResponse extends boolean = false>(
    content: WithResponseContent<WithResponse>,
    withResponse?: WithResponse,
    ephemeral?: boolean,
  ) =>
    new ResponseContent(
      content,
      ephemeral ?? this.interactions.replyEphemeral,
      withResponse,
    );

  private readonly children: AnyCommand[] = [];
  public get registry(): AnyCommand[] {
    return [
      this as unknown as AnyCommand,
      ...this.children.flatMap((child) => child.registry),
    ];
  }

  public readonly extend = <
    T extends CommandType,
    GO extends boolean = GuildOnly,
    RU extends boolean = RefuseUncached,
    RT = unknown,
    RST extends NonNullable<unknown> | null = null,
  >(
    options: CommandOptions<T, GO, RU, RT, RST>,
  ): Command<T, GO, RU, RT, RST> => {
    const command = new Command<T, GO, RU, RT, RST>({
      ...{
        category: options.category,
        enabled: options.enabled,
        interactions: options.interactions,
        permissions: options.permissions,
        throttle: options.throttle,
        data: undefined,
        type: undefined,
        controllers: undefined,
        run: undefined,
      },
      ...options,
    } as CommandOptions<T, GO, RU, RT, RST>);

    this.children.push(command as unknown as AnyCommand);

    return command;
  };

  public readonly extends = <
    T extends CommandType,
    GO extends boolean = GuildOnly,
    RU extends boolean = RefuseUncached,
    RT = unknown,
    RST extends NonNullable<unknown> | null = null,
  >(
    command: Command<T, GO, RU, RT, RST>,
  ): Command<T, GO, RU, RT, RST> => {
    const filterInheritable = ([, value]: [string, unknown]) => {
      if (typeof value === 'undefined') {
        return false;
      }

      return true;
    };

    const inheritProp = (
      key: keyof PartialCommandOptions<boolean, boolean>,
    ) => {
      const fromCmd = command[key as keyof typeof command];

      if (typeof fromCmd !== 'object' || fromCmd === null) {
        return fromCmd;
      }

      return {
        ...fromCmd,
        ...Object.fromEntries(
          Object.entries(this.options[key] ?? {}).filter(filterInheritable),
        ),
      };
    };

    command.children.push(
      new Command({
        type: this.type,
        data: this.data,
        run: this.run,
        controllers: this.controllers,
        permissions: inheritProp('permissions'),
        enabled: inheritProp('enabled'),
        interactions: inheritProp('interactions'),
        throttle: inheritProp('throttle'),
      } as unknown as CommandOptions<
        T,
        GO,
        RU,
        RT,
        RST
      >) as unknown as AnyCommand,
    );

    return command;
  };

  public readonly extendRaw = (command: Command) => {
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
          'guilds' in command.enabled &&
          (command.enabled.guilds === true ||
            Array.isArray(command.enabled.guilds))
        ) {
          contexts.push(InteractionContextType.Guild);
        }
      }

      if (!contexts.length) {
        Logger.warn(
          `No valid contexts found for command ${command.idWithoutPrefix}. Defaulting to Guild context.`,
        );
        contexts.push(InteractionContextType.Guild);
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

  public static readonly build = (command: AnyCommand): AnyCommand => {
    if (!CommandBase.isApiCommand(command)) {
      if (
        command.data instanceof SlashCommandStringOption &&
        command.data.autocomplete !== true
      ) {
        command.data.setAutocomplete(true);
      }

      return command;
    }

    const apiCommand = command as APICommand;
    const contexts = CommandBase.getContexts(apiCommand);
    const integrationTypes = CommandBase.getIntegrationTypes(
      apiCommand,
      contexts,
    );

    apiCommand.data.setContexts(contexts);
    apiCommand.data.setIntegrationTypes(integrationTypes);

    if (typeof apiCommand.data.default_member_permissions === 'undefined') {
      apiCommand.data.setDefaultMemberPermissions(
        apiCommand.permissions.defaultMemberPermissions,
      );
    }

    if (apiCommand.data instanceof SlashCommandBuilder) {
      if (typeof apiCommand.data.nsfw === 'undefined') {
        apiCommand.data.setNSFW(apiCommand.enabled.nsfw);
      }
    }

    this.registerLocalization(apiCommand);

    return apiCommand;
  };

  public static readonly registerLocalization = (command: APICommand) => {
    if (!I18n.isLocalizedCommand(command.idWithoutPrefix)) {
      return command;
    }

    const loadKey = (
      key: `commands:${string}`,
      onSuccess?: (localizations: Record<string, string>) => void,
    ) => {
      const defaultValue = I18n.localize(key, null, {
        defaultValue: '__NOT_TRANSLATED__',
      });

      if (defaultValue === '__NOT_TRANSLATED__') {
        return null;
      }

      const localization = Object.fromEntries(
        locales
          .map((locale) => [
            locale,
            I18n.localize(key, locale, {
              defaultValue: '__NOT_TRANSLATED__',
            }),
          ])
          .filter(([, value]) => value !== '__NOT_TRANSLATED__'),
      );

      if (onSuccess) {
        onSuccess(localization);
      }

      return localization;
    };

    loadKey(`commands:${command.idWithoutPrefix}.name`, (nameLocalizations) =>
      command.data.setNameLocalizations(nameLocalizations),
    );

    if (command.data instanceof SlashCommandBuilder) {
      loadKey(
        `commands:${command.idWithoutPrefix}.description`,
        (descriptionLocalizations) =>
          (command.data as SlashCommandBuilder).setDescriptionLocalizations(
            descriptionLocalizations,
          ),
      );

      const localizeOptions = (
        options: (
          | SlashCommandBuilder
          | SlashCommandSubcommandBuilder
          | SlashCommandOptionsOnlyBuilder
          | SlashCommandSubcommandGroupBuilder
          | SlashCommandSubcommandsOnlyBuilder
          | SlashCommandOptionsOnlyBuilder
          | ApplicationCommandOptionBase
        )[],
        path: string[] = ['options'],
      ) => {
        for (const option of options) {
          // const option = 'toJSON' in _option ? _option.toJSON() : _option;
          const key = `commands:${command.idWithoutPrefix}${path
            .map((p) => `.${p}`)
            .join('')}.${option.name}` as const;

          loadKey(`${key}.name`, (localizations) => {
            option.setNameLocalizations(localizations);
          });
          loadKey(`${key}.description`, (localizations) => {
            option.setDescriptionLocalizations(localizations);
          });

          if (
            option instanceof SlashCommandStringOption &&
            'choices' in option &&
            Array.isArray(option.choices) &&
            option.choices.length
          ) {
            option.setChoices(
              option.choices.map((choice) => ({
                ...choice,
                name_localizations: loadKey(
                  `${key}.choices.${choice.value}`,
                  (localizations) => {
                    choice.name_localizations = localizations;
                  },
                ),
              })),
            );
          }

          if ('options' in option && option.options) {
            localizeOptions(option.options as ApplicationCommandOptionBase[], [
              ...path,
              option.name,
              'options',
            ]);
          }
        }
      };

      localizeOptions(
        command.data.options as (
          | SlashCommandBuilder
          | ApplicationCommandOptionBase
        )[],
      );
    }

    return command;
  };

  /**
   * Run a function, throttled by the configured throttle options.
   * @param consumer The function to be called before the throttled function is executed, should return wether or not to proceed to `fn`.
   * @param fn The function to be executed, can return a value or a promise. Not executed if `before` returns false.
   * @param throttleAutoComplete Whether or not to throttle auto-complete commands. If set to false, the function will be executed immediately.
   * @returns A tuple of the result of the `fn` function and a promise for the `after` function.
   */
  public readonly withThrottle = async <
    T extends () => unknown | Promise<unknown>,
  >(
    consumer: ThrottleConsumer,
    fn: T,
    throttleAutoComplete = false,
  ) => {
    if (this.type === CommandType.AutoComplete && !throttleAutoComplete) {
      return [
        fn(),
        {
          ok: true,
          expiresAt: Date.now() - 1,
        } as ThrottleConsumerResult,
      ] as const;
    }

    if (!this.throttle.enabled) {
      return [
        fn(),
        {
          ok: true,
          expiresAt: Date.now() - 1,
        } as ThrottleConsumerResult,
      ] as const;
    }

    const consumerResult = await consumer(this.throttle);

    if (!consumerResult.ok) {
      return [undefined, consumerResult] as const;
    }

    return [fn(), consumerResult] as const;
  };

  public static readonly resolveId = (
    cmd:
      | NonAPICommand
      | RESTPostAPIChatInputApplicationCommandsJSONBody
      | RESTPostAPIContextMenuApplicationCommandsJSONBody,
  ) => {
    const resolveCommandTypeFromDiscordType = (
      type: ApplicationCommandType | CommandType,
    ): CommandType => {
      switch (type) {
        case ApplicationCommandType.ChatInput:
          return CommandType.ChatInput;
        case ApplicationCommandType.User:
          return CommandType.UserContextMenu;
        case ApplicationCommandType.Message:
          return CommandType.MessageContextMenu;
        case ApplicationCommandType.PrimaryEntryPoint:
          return CommandType.PrimaryEntryPoint;
        case CommandType.ChatInput:
        case CommandType.ChatInputPlain:
        case CommandType.UserContextMenu:
        case CommandType.MessageContextMenu:
        case CommandType.PrimaryEntryPoint:
        case CommandType.Button:
        case CommandType.StringSelect:
        case CommandType.UserSelect:
        case CommandType.RoleSelect:
        case CommandType.MentionableSelect:
        case CommandType.ChannelSelect:
        case CommandType.ModalSubmit:
        case CommandType.AutoComplete:
        default:
          return type;
      }
    };

    if (!cmd.type) {
      throw new Error(
        `Unable to resolve command type for command ${cmd.name}, please provide a type: ${JSON.stringify(
          cmd,
          null,
          2,
        )}`,
      );
    }

    let json;
    const id: string | null =
      cmd instanceof Command
        ? (() => {
            try {
              json = cmd.data.toJSON();
            } catch (err) {
              json = cmd.data;
              Logger.error('Failed to convert command to JSON', {
                err,
                data: cmd.data,
              });
              return null;
            }
            return 'custom_id' in json
              ? json.custom_id
              : 'name' in json
                ? json.name
                : null;
          })()
        : cmd.name;

    if (id === null) {
      throw new Error(
        `Unable to resolve any unique identifier for command, please provide a name or customId: ${json}`,
      );
    }

    return `${resolveCommandTypeFromDiscordType(cmd.type)}/${id}`;
  };

  public static readonly findInApiData = (
    id: string,
    data: (
      | RESTPostAPIChatInputApplicationCommandsJSONBody
      | RESTPostAPIContextMenuApplicationCommandsJSONBody
    )[],
  ) => {
    return data.find((cmd) => this.resolveId(cmd) === id);
  };

  protected static readonly dataResolver = <Type extends CommandType>(
    type: Type,
    _data:
      | CommandData<Type>
      | ((builder: CommandData<Type>) => CommandData<Type>),
  ): CommandData<Type> => {
    let resolved: CommandData<Type>;

    const cast = (builder: unknown) => builder as CommandData<Type>;
    const data = (builder: unknown) => {
      if (typeof _data === 'function') {
        return _data(cast(builder));
      }

      return cast(_data);
    };

    switch (type) {
      case CommandType.ChatInput:
      case CommandType.ChatInputPlain:
      case CommandType.PrimaryEntryPoint:
        resolved = data(new SlashCommandBuilder());
        break;
      case CommandType.Button:
        resolved = data(new ButtonBuilder());
        break;
      case CommandType.StringSelect:
        resolved = data(new StringSelectMenuBuilder());
        break;
      case CommandType.UserSelect:
        resolved = data(new UserSelectMenuBuilder());
        break;
      case CommandType.RoleSelect:
        resolved = data(new RoleSelectMenuBuilder());
        break;
      case CommandType.MentionableSelect:
        resolved = data(new MentionableSelectMenuBuilder());
        break;
      case CommandType.ChannelSelect:
        resolved = data(new ChannelSelectMenuBuilder());
        break;
      case CommandType.ModalSubmit:
        resolved = data(new ModalBuilder());
        break;
      case CommandType.UserContextMenu:
      case CommandType.MessageContextMenu:
        resolved = data(new ContextMenuCommandBuilder());
        if (resolved instanceof ContextMenuCommandBuilder) {
          if (type === CommandType.UserContextMenu) {
            resolved.setType(ApplicationCommandType.User);
          } else {
            resolved.setType(ApplicationCommandType.Message);
          }
        }
        break;
      case CommandType.AutoComplete:
        resolved = data(new SlashCommandStringOption().setAutocomplete(true));
    }

    return resolved;
  };

  protected static readonly handlePermissions = async <
    Type extends CommandType,
    GuildOnly extends boolean,
    RefuseUncached extends boolean,
    ReturnType,
  >(
    command: Command<Type, GuildOnly, RefuseUncached, ReturnType>,
    interaction: CommandInteraction,
  ): Promise<true | [LocalizedLabelKey, Record<string, string> | null]> => {
    command.debug('Handling permissions');

    const memberPermLevel = await Permissions.resolveForMember(
      interaction.member,
      interaction.guild,
    );

    if (
      command.permissions.level > 0 &&
      memberPermLevel < command.permissions.level
    ) {
      return ['core:permissions.levelTooLow', null];
    }

    if (command.permissions.client.length > 0 && interaction.inGuild()) {
      if (!interaction.guild || !interaction.guild.members.me) {
        return ['core:permissions.missingBotScope', null];
      }

      const me = interaction.guild.members.me;

      if (!me.permissions.has(command.permissions.client)) {
        const missing = me.permissions.missing(
          command.permissions.client,
          true,
        );

        return [
          'core:permissions.botMissingPermissions',
          {
            permissions: Permissions.displayPermissions(missing),
          },
        ];
      }
    }

    if (command.permissions.user.length > 0) {
      if (!interaction.inCachedGuild()) {
        if (interaction.inGuild()) {
          return ['core:permissions.unavailable.cachedGuild', null];
        }
      } else if (interaction.channel) {
        const missing = interaction.channel
          .permissionsFor(interaction.user.id, true)
          ?.missing(command.permissions.user);

        if (missing?.length) {
          return [
            'core:permissions.missingPermissions',
            {
              permissions: Permissions.displayPermissions(missing),
            },
          ];
        }
      }
    }

    if (
      command.permissions.whitelist.guilds.length > 0 &&
      interaction.inGuild()
    ) {
      if (!command.permissions.whitelist.guilds.includes(interaction.guildId)) {
        return ['core:permissions.unavailable.guild', null];
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
        return ['core:permissions.unavailable.channel', null];
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
        return ['core:permissions.unavailable.missingRoles', null];
      }
    }

    if (command.permissions.whitelist.users.length > 0) {
      if (!command.permissions.whitelist.users.includes(interaction.user.id)) {
        return ['core:permissions.unavailable.unauthorized', null];
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
        return ['core:permissions.unavailable.channelCategory', null];
      }
    }

    if (interaction.guildId && memberPermLevel <= PermLevel['Server Owner']) {
      const guild = await Database.Guild.resolve(interaction.guildId);
      if (guild.disabledCommands.includes(command.id)) {
        return ['core:permissions.unavailable.disabledByServer', null];
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
    | [LocalizedLabelKey, Record<string, string> | null]
    | CommandInteraction<Type, CacheTypeResolver<GuildOnly, RefuseUncached>>
  > => {
    command.debug('Handling interaction');

    if (command.enabled.global === false) {
      command.debug('Disabled globally, refusing interaction');
      return ['core:commands.disabled', null];
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
        return ['core:commands.guildOnly', null];
      }

      if (command.interactions.refuseUncached && !interaction.inCachedGuild()) {
        command.debug('Refusing uncached interaction');
        return ['core:commands.cachedGuildOnly', null];
      }
    }

    if (interaction.inGuild()) {
      if (
        command.enabled.nsfw &&
        interaction.channel &&
        (interaction.channel.isThread() || !interaction.channel.nsfw)
      ) {
        command.debug('Refusing interaction in non-NSFW channel');
        return ['core:commands.nsfwChannelOnly', null];
      }

      if (
        typeof command.enabled.guilds !== 'boolean' &&
        command.enabled.guilds.length > 0 &&
        !command.enabled.guilds.includes(interaction.guildId)
      ) {
        command.debug('Refusing interaction in unauthorized guild');
        return ['core:permissions.unavailable.guild', null];
      }
    } else {
      if (
        ('dm' in command.enabled && command.enabled.dm === false) ||
        ('privateChannel' in command.enabled &&
          command.enabled.privateChannel === false)
      ) {
        command.debug('Refusing DM/Private interaction');
        return ['core:commands.guildOnly', null];
      }
    }

    if (command.interactions.deferReply && interaction.isRepliable()) {
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
        : (subcommandGroup ?? subcommand)
          ? command.controllers[(subcommandGroup ?? subcommand)!]
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
  ReturnType = unknown,
  ResolveType extends NonNullable<unknown> | null = null,
> extends CommandBase<
  Type,
  GuildOnly,
  RefuseUncached,
  ReturnType,
  ResolveType
> {
  public constructor(
    options: CommandOptions<
      Type,
      GuildOnly,
      RefuseUncached,
      ReturnType,
      ResolveType
    >,
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

type NonAPICommand<
  Type extends NonAPICommandTypeValue = NonAPICommandTypeValue,
> = AnyTypedCommand[Type];

export {
  Command,
  CommandBase,
  type AnyCommand,
  type APICommand,
  type NonAPICommand,
  type ThrottleConsumer,
  type ThrottleConsumerResult,
};
