import {
  BaseInteraction,
  Client as DiscordClient,
  ClientOptions as DiscordClientOptions,
  EmbedData,
  Events,
  If,
  Locale,
  MessageFlags,
  version as discordJsVersion,
} from 'discord.js';
import { ClusterClient } from 'discord-hybrid-sharding';
import { Directories, InteractionUtils } from '../utils';
import {
  CommandMiddleware,
  CommandMiddlewareContext,
  CommandMiddlewareMetaContext,
  CommandMiddlewareOptions,
} from '../middleware';
import {
  ChatInputCommand,
  CommandThrottle,
  CommandThrottleOptions,
  MessageContextCommand,
  ModalCommand,
  UserContextCommand,
} from '../commands';
import {
  Logger,
  FileLoggerOptions,
  LoggerOptions,
  DiscordLogger,
} from '../logger';
import { i18n } from 'i18next';
import {
  CommandManager,
  CommandManagerCommandsOptions,
  ClientPermissionOptions,
  ClientPermissions,
} from '../managers';
import { IEmojis, UserColors } from './config';
import { Embeds } from '.';
import { ClientJobManager } from '../jobs';
import pkg from '../../../package.json';
import { Constants } from '../constants';

export type ClientWithCluster<Ready extends boolean = boolean> =
  Client<Ready> & {
    cluster: ClusterClient<Client>;
  };

export interface ClientInitializationOptions {
  commandDirPath: Directories;
}

export interface ClientDebugOptions {
  enabled: boolean;
  commandData: boolean;
}

export type GlobalMiddlewareOptions = CommandMiddlewareOptions<
  BaseInteraction,
  CommandMiddlewareContext<BaseInteraction>
>;

export type GlobalMiddleware = CommandMiddleware<
  BaseInteraction,
  CommandMiddlewareContext<BaseInteraction>
>;

/** Additional custom client options */
export interface ClientOptions {
  /** Additional debug options */
  debug: ClientDebugOptions;
  /** Whether to suppress the vanity print to console */
  suppressVanity: boolean;
  errorChannelId?: string | null;
  commandUsageChannelId?: string | null;
  /**
   * The default command cooldown for all commands - default
   * config is 2 usages per 5 seconds - short burst protection
   */
  defaultCommandThrottling: CommandThrottleOptions;
  /**
   * If a command has a permission level of Administrator, should we
   * automatically hide that command from normal users, by using
   * `#setDefaultMemberPermissions(0)` on the command?
   */
  defaultLockMemberPermissions: boolean;
  /** Custom permissions for the client */
  internalPermissions: ClientPermissionOptions;
  /**
   * Should we refuse, and reply to, interactions that belong to unknown commands
   * @default false
   */
  refuseUnknownCommandInteractions: boolean;
  /**
   * Should we print information on unknown command interactions,
   * you should enable this if you run multiple processes/clients
   * on the same bot user
   * @default true
   */
  suppressUnknownInteractionWarning: boolean;
  /** The id to register development commands to */
  developmentServerId?: string | undefined;
  logging?: Omit<LoggerOptions & FileLoggerOptions, 'client'>;
  pkg?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
  globalMiddleware?: GlobalMiddlewareOptions;
}

export interface RequiredClientOptions<Ready extends boolean = boolean> {
  /** Discord bot token */
  token: If<Ready, string, string | null>;
  /** The bot' application id */
  applicationId: string;
  directories: CommandManagerCommandsOptions;
  /** Customize colors for the client */
  colors: UserColors;
  /** Customize emojis for the client */
  emojis: IEmojis;
  /** The i18n instance to use for the
   * client, should be initialized with
   * the default resource bundles
   */
  I18N: i18n;
  /** Available locales for the client
   * should be resolved from the resource bundles
   */
  locales: Locale[];
}

export class Client<
  Ready extends boolean = boolean,
> extends DiscordClient<Ready> {
  cluster: ClusterClient<Client<Ready>> | null = null;
  readonly startInitializeTs = process.hrtime();
  readonly colors: UserColors;
  readonly embeds: Embeds;
  readonly clientEmojis: IEmojis;
  directories: CommandManagerCommandsOptions;
  readonly extendedOptions: DiscordClientOptions &
    Partial<ClientOptions> &
    RequiredClientOptions<Ready>;
  readonly debug: ClientDebugOptions;
  readonly logger: Logger;
  readonly applicationId: string;
  readonly commandManager = new CommandManager({
    client: this,
  });
  readonly defaultCommandThrottling: CommandThrottle;
  readonly internalPermissions: ClientPermissions;
  jobManager: ClientJobManager | null = null;
  I18N: i18n;
  locales: Locale[];
  pkg: Record<string, unknown> = pkg;
  extensions: Record<string, unknown> = {};
  globalMiddleware: GlobalMiddleware;

  constructor(
    /** Your discord.js client - doesn't have to be logged in or initialized */
    options: DiscordClientOptions &
      Partial<ClientOptions> &
      RequiredClientOptions<Ready>,
  ) {
    super(options);
    this.extendedOptions = options;
    this.directories = options.directories;
    const { debug } = options;
    this.debug = {
      enabled: debug?.enabled ?? false,
      commandData: debug?.commandData ?? false,
    };
    this.token = options.token;
    this.applicationId = options.applicationId;
    this.defaultCommandThrottling = new CommandThrottle(
      options.defaultCommandThrottling ?? {},
    );
    this.internalPermissions = new ClientPermissions(
      options.internalPermissions ?? {},
    );
    this.logger = new Logger({
      client: this,
      combinedLogging: options.logging?.combinedLogging ?? true,
    });
    this.extensions = options.extensions ?? {};
    this.colors = {
      debug: options.colors.debug,
      error: options.colors.error,
      info: options.colors.info,
      primary: options.colors.primary,
      secondary: options.colors.secondary,
      success: options.colors.success,
      warning: options.colors.warning,
      waiting: options.colors.waiting,
    };
    this.clientEmojis = {
      success: options.emojis.success,
      error: options.emojis.error,
      info: options.emojis.info,
      warning: options.emojis.warning,
      debug: options.emojis.debug,
      waiting: options.emojis.waiting,
      separator: options.emojis.separator,
    };

    this.globalMiddleware = new CommandMiddleware(
      options.globalMiddleware ?? {},
    );
    this.pkg = options.pkg ?? pkg;
    const verStr = this.pkg.version
      ? ` ${this.clientEmojis.separator} v${this.pkg.version}`
      : '';
    const clientBrandingOptions: EmbedData = {
      footer: {
        text: `${this.pkg.name ?? 'Discord Bot'}${verStr}`,
      },
    };
    this.embeds = new Embeds({
      colors: this.colors,
      brandingOptions: clientBrandingOptions,
      emojis: this.clientEmojis,
    });

    this.I18N = options.I18N;
    this.locales = options.locales;

    // Initialize the client
    this.initialize();
  }

  printVanity = () => {
    if (this.extendedOptions.suppressVanity) return;
    const author =
      this.pkg.author &&
      typeof this.pkg.author === 'object' &&
      'name' in this.pkg.author
        ? this.pkg.author.name
        : (this.pkg.author ?? 'Unknown');
    this.logger.info(
      [
        '',
        '--------------------------------------------------------',
        `${this.pkg.name} by ${author}`,
        '--------------------------------------------------------',
        `Version: v${this.pkg.version ?? 'Unknown'}`,
        `Node.js version: ${process.version}`,
        `Discord.js version: ${discordJsVersion}`,
        `Licensing: ${this.pkg.license ?? 'Unknown'}`,
        '--------------------------------------------------------',
      ].join('\n'),
    );
  };

  initialize(): this {
    this.printVanity();
    this.registerEssentialListeners();
    this.commandManager.initialize(this.directories);
    return this;
  }

  registerEssentialListeners = () => {
    this.once(Events.ClientReady, async (c) => {
      // Apply branding to our embeds once we log-in
      if (c.user && !this.embeds.brandingOptions.author)
        this.embeds.brandingOptions.author = {
          name: c.user.username,
          iconURL: c.user.displayAvatarURL(),
        };

      this.jobManager = new ClientJobManager(
        this as Client<true>,
        this.commandManager.jobs.toJSON(),
      );

      this.logger.info(
        this.jobManager.tag,
        `Client is ready, initializing (${this.jobManager.jobs.size}) jobs...`,
      );
      await this.jobManager.startAll();
    });

    this.on(Events.InteractionCreate, async (interaction) => {
      // This can't happen, since you need to be logged in to receive
      // events, but lets assert for our type conversion
      if (!this.isReady()) {
        throw new Error(
          [
            'Received an interaction before the client was ready,',
            'this should never happen and is very likely a bug in your code - please investigate',
            'and create a GitHub issue if you believe this is a bug.',
          ].join(' '),
        );
      }
      const readyClient = this as Client<true>;

      // Middleware context
      const invokedAt = new Date();
      const startRunTs = process.hrtime();
      const middlewareContext: CommandMiddlewareMetaContext = {
        invokedAt,
        startRunTs,
      };

      // Resolve the command/component identifier
      const commandId = this.commandManager.resolveCommandId(interaction);

      // Resolve the command
      let command = this.commandManager.commandById(commandId);

      // At the time of writing this auto complete is the only
      // non-repliable interaction - separate handler as it
      // doesn't have an overlapping structure with our commands
      if (interaction.isAutocomplete()) {
        const autoCompleteHandler =
          this.commandManager.autoComplete.get(commandId);
        if (!autoCompleteHandler) return;
        await DiscordLogger.tryWithErrorLogging(
          readyClient,
          () => autoCompleteHandler.handleInteraction(interaction),
          'An error occurred while handling an auto complete interaction',
        );
        return;
      }

      // Opt out of handler for components - yay!
      if (
        (interaction.isMessageComponent() || interaction.isModalSubmit()) &&
        commandId.startsWith(Constants.EMIT_COMPONENT_HANDLER_IDENTIFIER)
      ) {
        this.logger.debug(
          [
            `Skipping component interaction for command "${commandId}"`,
            `as it starts with the reserved identifier "${Constants.EMIT_COMPONENT_HANDLER_IDENTIFIER}"`,
            'which is used for omitting component handlers',
          ].join(' '),
        );
        return;
      }

      // Try to resolve the command from the component handler identifier
      if (
        !command &&
        commandId.indexOf(Constants.EMIT_COMPONENT_HANDLER_IDENTIFIER) > 0
      ) {
        const [tryCommandId] = commandId.split(
          Constants.EMIT_COMPONENT_HANDLER_IDENTIFIER,
        ) as [string];
        const tryCommand = this.commandManager.commandById(tryCommandId);
        if (tryCommand) command = tryCommand;
      }

      // Make sure we have a command
      if (!command) {
        if (this.extendedOptions.refuseUnknownCommandInteractions) {
          await InteractionUtils.replyDynamic(readyClient, interaction, {
            embeds: [
              this.embeds.error({
                title: this.I18N.t('core:commands.unknownCommandTitle'),
                description: this.I18N.t(
                  'core:commands.unknownCommandDescription',
                  { commandId },
                ),
              }),
            ],
          });
          return;
        }
        if (!this.extendedOptions.suppressUnknownInteractionWarning) {
          this.logger.warn(
            `Unknown interaction with id "${commandId}" (${interaction.type})`,
          );
        }
        return;
      }

      // Make sure the command is enabled
      if (command.disabled) {
        await InteractionUtils.replyDynamic(readyClient, interaction, {
          embeds: [
            this.embeds.error({
              title: this.I18N.t('core:commands.commandDisabledTitle'),
              description: this.I18N.t(
                'core:commands.commandDisabledDescription',
              ),
            }),
          ],
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }

      const sharedErrorLines = [
        'this should never happen and is very likely a bug in your code -',
        'please investigate and create a GitHub issue if you believe this is a bug.',
      ];

      if (command instanceof ChatInputCommand) {
        if (!interaction.isChatInputCommand()) {
          throw new Error(
            [
              `Interaction for ChatInputCommand "${commandId}" is not a ChatInputCommand interaction,`,
              ...sharedErrorLines,
            ].join(' '),
          );
        }
        await command.handleInteraction(
          interaction,
          readyClient,
          middlewareContext,
        );
      } else if (command instanceof UserContextCommand) {
        if (!interaction.isUserContextMenuCommand()) {
          throw new Error(
            [
              `Interaction for UserContextCommand "${commandId}" is not a UserContextCommand interaction,`,
              ...sharedErrorLines,
            ].join(' '),
          );
        }
        await command.handleInteraction(
          interaction,
          readyClient,
          middlewareContext,
        );
      } else if (command instanceof MessageContextCommand) {
        if (!interaction.isMessageContextMenuCommand()) {
          throw new Error(
            [
              `Interaction for MessageContextCommand "${commandId}" is not a MessageContextCommand interaction,`,
              ...sharedErrorLines,
            ].join(' '),
          );
        }
        await command.handleInteraction(
          interaction,
          readyClient,
          middlewareContext,
        );
      } else if (interaction.isMessageComponent()) {
        await command.handleInteraction(
          interaction,
          readyClient,
          middlewareContext,
        );
      } else if (interaction.isModalSubmit()) {
        if (!(command instanceof ModalCommand)) {
          throw new Error(
            [
              `Interaction for ModalCommand "${commandId}" is not a ModalCommand interaction,`,
              ...sharedErrorLines,
            ].join(' '),
          );
        }
        await command.handleInteraction(
          interaction,
          readyClient,
          middlewareContext,
        );
      } else {
        // Unknown command type
        throw new Error(
          [
            `Unknown command type for command "${commandId}" - this should never happen,`,
            'and is very likely a bug in your code - please investigate',
            'and create a GitHub issue if you believe this is a bug.',
          ].join(' '),
        );
      }

      // Send discord logging info (configurable)
      if (this.extendedOptions.commandUsageChannelId) {
        void DiscordLogger.logCommandUsage(this, command, interaction);
      }
    });
  };
}
