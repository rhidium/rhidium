import {
  APIInteractionGuildMember,
  ApplicationCommand,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  BaseInteraction,
  Collection,
  ContextMenuCommandBuilder,
  FetchApplicationCommandOptions,
  GuildMember,
  GuildResolvable,
  REST,
  RequestData,
  Routes,
  Snowflake,
} from 'discord.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { GlobalMiddlewareOptions, type Client } from '../client';
import {
  APICommandData,
  APICommandType,
  ChatInputCommand,
  CommandType,
  ComponentCommandBase,
  MessageContextCommand,
  UserContextCommand,
  isCommand,
} from '../commands';
import { CommandCooldownType } from '../commands/cooldown';
import { PermLevel } from '.';
import {
  Directories,
  FileUtils,
  GenericObject,
  ObjectUtils,
  StringUtils,
} from '../utils';
import { AutoCompleteOption } from '../commands/auto-complete';
import { Constants, UnitConstants } from '../constants';
import { ClientEventListener } from '.';
import { Job } from '../jobs';

export type ExcludedCommandNames =
  | 'components'
  | 'options'
  | 'types'
  | 'helpers'
  | 'controllers'
  | 'services'
  | 'transformers'
  | 'enums';

export const excludedCommandNames: ExcludedCommandNames[] = [
  'components',
  'options',
  'types',
  'helpers',
  'controllers',
  'services',
  'transformers',
  'enums',
];

export interface DeployCommandsResult {
  success: boolean;
  commands: APICommandData[];
  data: unknown;
}

export type DeployCommandsType = 'global' | 'development';
export type DeployCommandsOptions = FetchApplicationCommandOptions &
  (
    | { type: 'global'; guildId?: Snowflake }
    | { type: 'development'; guildId: Snowflake }
  );

export interface CommandManagerCommandsOptions {
  /** Absolute or relative path(s) to the folders/directories that hold your client listeners */
  listeners?: Directories;
  /** Absolute or relative path(s) to the folders/directories that hold your chat-input commands */
  chatInputs?: Directories;
  /** Absolute or relative path(s) to the folders/directories that hold your auto-complete option handlers */
  autoCompletes?: Directories;
  /** Absolute or relative path(s) to the folders/directories that hold your user-context commands */
  userContextMenus?: Directories;
  /** Absolute or relative path(s) to the folders/directories that hold your message-context commands */
  messageContextMenus?: Directories;
  /** Absolute or relative path(s) to the folders/directories that hold your component commands */
  componentCommands?: Directories;
  /** Absolute or relative path(s) to the folders/directories that hold your jobs */
  jobs?: Directories;
  /** Global middleware configuration for the client/module */
  middleware?: GlobalMiddlewareOptions;
}

export const isCommandManagerCommandsOptions = (
  item: unknown,
): item is CommandManagerCommandsOptions =>
  typeof item === 'object' &&
  item !== null &&
  ('listeners' in item ||
    'chatInputs' in item ||
    'autoCompletes' in item ||
    'userContextMenus' in item ||
    'messageContextMenus' in item ||
    'middleware' in item ||
    'componentCommands' in item ||
    'jobs' in item);

export interface CommandManagerOptions {
  client: Client;
}

export class CommandManager {
  readonly client: Client;

  listeners = new Collection<string, ClientEventListener>();
  chatInput = new Collection<string, ChatInputCommand>();
  userContextMenus = new Collection<string, UserContextCommand>();
  messageContextMenus = new Collection<string, MessageContextCommand>();
  componentCommands = new Collection<string, ComponentCommandBase>();
  autoComplete = new Collection<string, AutoCompleteOption>();
  jobs = new Collection<string, Job>();

  get commandSize() {
    return (
      this.chatInput.size +
      this.userContextMenus.size +
      this.messageContextMenus.size +
      this.componentCommands.size
    );
  }

  get apiCommands() {
    return new Collection<string, APICommandType>()
      .concat(this.chatInput)
      .concat(this.userContextMenus)
      .concat(this.messageContextMenus);
  }

  /**
   * Represents a concatenated list of all components
   * across all modules (src/modules) that are used
   */
  readonly directories: Record<
    keyof Omit<CommandManagerCommandsOptions, 'middleware'>,
    string[]
  > & {
    middleware: Required<GlobalMiddlewareOptions>;
  } = {
    listeners: [],
    chatInputs: [],
    autoCompletes: [],
    userContextMenus: [],
    messageContextMenus: [],
    middleware: {
      postRunExecution: [],
      preRunChecks: [],
      preRunExecution: [],
      preRunThrottle: [],
      runExecutionReturnValues: [],
    },
    componentCommands: [],
    jobs: [],
  };

  constructor(options: CommandManagerOptions) {
    this.client = options.client;
  }

  // Construct and prepare an instance of the REST client
  private get rest() {
    if (!this.client.token) throw new Error('No token set for client');
    return new REST({ version: '10' }).setToken(this.client.token);
  }

  mapDataCallback = (command: APICommandType) => command.data;

  /** Returns an array of concatenated global data ready to send of to Discord's API */
  get globalCommandData() {
    return this.apiCommands
      .filter(
        (command: APICommandType) =>
          command.disabled !== true && command.global === true,
      )
      .map(this.mapDataCallback);
  }

  /**
   * Represents Discord command API data that is only active in
   * pre-configured development server(s)
   */
  get developmentCommandData() {
    return this.apiCommands
      .filter(
        (command: APICommandType) =>
          command.disabled !== true && command.global === false,
      )
      .map(this.mapDataCallback);
  }

  private _commandAPIData:
    | Collection<string, ApplicationCommand<{ guild: GuildResolvable }>>
    | undefined = undefined;

  commandAPIData = async () => {
    if (this._commandAPIData) return this._commandAPIData;
    const options = this.resolveDeployCommandOptions(
      this.client.extendedOptions.developmentServerId,
    );
    const data = await this.fetchApplicationCommands(options);
    this._commandAPIData = data;
    return this._commandAPIData;
  };

  putCommands = async (
    route: `/${string}`,
    commands: APICommandData[],
    type: DeployCommandsType,
    options?: Omit<Partial<RequestData>, 'body'> | undefined,
  ) => {
    this.client.logger.info(
      `Started refreshing ${commands.length} ${StringUtils.titleCase(
        type,
      )} application (/) commands.`,
    );

    const data = await this.rest.put(route, {
      ...options,
      body: commands,
    });

    this.client.logger.success(
      `Successfully reloaded ${commands.length} ${StringUtils.titleCase(
        type,
      )} application (/) commands.`,
    );

    return data;
  };

  clearCommands = async (type: DeployCommandsType) => {
    const route =
      type === 'global'
        ? Routes.applicationCommands(this.client.applicationId)
        : (() => {
            if (!this.client.extendedOptions.developmentServerId) {
              this.client.logger.warn(
                'No development server id provided, skipping development command clear.',
              );
              return null;
            }
            return Routes.applicationGuildCommands(
              this.client.applicationId,
              this.client.extendedOptions.developmentServerId,
            );
          })();

    if (!route) return;

    this.client.logger.info(
      `Started clearing ${type} application (/) commands.`,
    );

    const data = await this.rest.put(route, {
      body: [],
    });

    this.client.logger.success(
      `Successfully cleared ${type} application (/) commands.`,
    );

    return data;
  };

  debugAPICommandData = (
    type: DeployCommandsType,
    commands: APICommandData[],
  ) => {
    const debugTag = `${StringUtils.titleCase(
      type,
    )} Application Command API Data`;
    this.client.logger.startLog(debugTag);
    console.table(
      commands.map((e) => {
        const options =
          e instanceof ContextMenuCommandBuilder
            ? 'n/a'
            : (e.options?.length ?? 0);
        const nameLocalization = e.name_localizations
          ? Object.keys(e.name_localizations).length
          : 0;
        const descriptionLocalization = !(
          e instanceof ContextMenuCommandBuilder
        )
          ? e.description_localizations
            ? Object.keys(e.description_localizations).length
            : 0
          : 'n/a';
        return {
          ...e,
          options,
          name_localizations: nameLocalization,
          description_localizations: descriptionLocalization,
        };
      }),
    );
    this.client.logger.endLog(debugTag);
  };

  debugInternalCommands = () => {
    console.table(
      this.apiCommands.map((e) => ({
        name: e.data.name,
        category: e.category,
        aliasOf: e.aliasOf?.data.name ?? null,
        permLevel: PermLevel[e.permLevel],
        cooldown: `@${CommandCooldownType[e.cooldown.type]} - ${
          e.cooldown.usages
        }/${Math.round(e.cooldown.duration / UnitConstants.MS_IN_ONE_SECOND)} seconds`,
        src: FileUtils.relativeProjectPath(e.sourceFile),
        disabled: e.disabled,
        global: e.global,
        nsfw: e.nsfw,
      })),
    );
  };

  deployCommands = async (
    options: DeployCommandsOptions,
  ): Promise<DeployCommandsResult> => {
    // Resolve deploy type variables
    const commands =
      options.type === 'global'
        ? this.globalCommandData
        : this.developmentCommandData;

    const route =
      options.type === 'global'
        ? Routes.applicationCommands(this.client.applicationId)
        : Routes.applicationGuildCommands(
            this.client.applicationId,
            options.guildId,
          );

    // Put command data over REST
    let data;
    try {
      data = await this.putCommands(route, commands, options.type);
    } catch (err) {
      this.client.logger.error(
        `Error encountered while deploying ${options.type} commands:`,
        err,
      );
      return { success: false, commands, data: null };
    }

    // Log the data if we're in debug mode
    if (this.client.debug.commandData) {
      this.debugInternalCommands();
      this.debugAPICommandData(options.type, commands);
    }

    // Clear commands belonging to the opposite type
    if (options.type === 'development') {
      void this.clearCommands('global');
    } else if (options.guildId) {
      void this.clearCommands('development');
    }

    // Return success
    return {
      success: true,
      commands,
      data,
    };
  };

  findCommandsInFolder = <T extends CommandType>(dirPath: Directories) => {
    let resolvedDirPath = dirPath;
    // Resolve string input into array
    if (typeof dirPath === 'string') resolvedDirPath = [dirPath];

    const commands: Collection<string, T> = new Collection();

    // Loop over all provided paths
    for (let dPath of resolvedDirPath) {
      // First, resolve provided dirPath (relative => absolute)
      if (!path.isAbsolute(dPath)) dPath = path.resolve(dPath);

      // Throw an error if the provided dPath doesn't exists/isn't valid
      if (!existsSync(dPath)) {
        this.client.logger.error(
          `Invalid path: No file/directory exists at provided path "${FileUtils.relativeProjectPath(
            dPath,
          )}"`,
        );
        continue;
      }

      // Recursively get all files from target dPath
      const allFilePaths = FileUtils.getFiles(dPath);

      // Loop over every file path, initializing the command,
      // calling the constructor, and saving it in out collection
      for (const cmdPath of allFilePaths) {
        // There is no way to say for sure the type of this
        // assignment will be Promise<BaseCommand>, hence,
        // We have to do some strong type/instance checking before continuing
        // We can't dynamically import .ts/.js files using (await import)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        let cmd: unknown = require(cmdPath);

        const fileDirectoryName = path.basename(path.dirname(cmdPath));
        const isExcluded = excludedCommandNames.some(
          (e) =>
            cmdPath.endsWith(`${e}.js`) ||
            cmdPath.endsWith(`${e}.ts`) ||
            fileDirectoryName === e,
        );
        if (isExcluded) {
          this.client.logger.debug(
            `Skipping excluded command: ${FileUtils.relativeProjectPath(cmdPath)} (reserved file name)`,
          );
          continue;
        }

        // Resolve default exports
        if (typeof cmd === 'object' && cmd !== null && 'default' in cmd)
          cmd = cmd.default;

        if (!isCommand(cmd)) {
          this.client.logger.debug(
            `Skipping non-command: ${FileUtils.relativeProjectPath(cmdPath)}`,
          );
          continue;
        }

        commands.set(cmdPath, cmd as T);
      }
    }

    return commands;
  };

  /**
   * Recursively finds and loads all Commands from a given path
   */
  loadCommandCollection<T extends CommandType>(
    dirPath: Directories,
    collection: Collection<string, T>,
  ): {
    collection: Collection<string, T>;
    added: T[];
  } {
    const added: T[] = [];
    const { logger } = this.client;
    const commands = this.findCommandsInFolder<T>(dirPath);
    const dirPaths = typeof dirPath === 'string' ? [dirPath] : dirPath;
    const dirPathOutput = dirPaths
      .map((e) => FileUtils.relativeProjectPath(e))
      .join(', ');

    // Warning, empty command folder provided - return early
    if (commands.size === 0) {
      logger.warn(`No commands found in provided directory: ${dirPathOutput}`);
      return {
        collection,
        added: [],
      };
    }

    for (const [cmdPath, command] of commands) {
      const displayPath = FileUtils.relativeProjectPath(cmdPath);
      if (this.client.debug.enabled) {
        logger.debug(`Loading command ${displayPath}`);
      }

      // Skip development command in production mode
      if (
        process.env.NODE_ENV === 'production' &&
        command.category === 'development'
      ) {
        logger.debug(
          `Skipping development command "${command.data.name}" because we're in production mode: ${displayPath}`,
        );
        continue;
      }

      // Load the command
      command.load(cmdPath, this.client, this);
      if (!command.initialized) {
        logger.warn(
          `Command "${command.data.name}" failed to initialize, skipping command: ${displayPath}`,
        );
        continue;
      }
      const exists = collection.some((e) => e.data.name === command.data.name);

      // Register potentially valid aliases before skipping
      const canHaveAliases = !command.aliasOf && command.aliases?.length > 0;
      const aliases: CommandType[] = canHaveAliases
        ? this.resolveAliases(command)
        : [];
      for (const alias of aliases) {
        logger.debug(`Loading alias   ${displayPath}`);
        const aliasExists = collection.some(
          (e) => e.data.name === alias.data.name,
        );
        if (aliasExists) {
          logger.warn(
            `Command "${alias.data.name}" already exists, skipping command: Alias of ${displayPath}`,
          );
          continue;
        }
        collection.set(alias.data.name, alias as T);
      }

      // Skip if the command already exists
      if (exists) {
        logger.warn(
          `Command "${command.data.name}" already exists, skipping command: ${displayPath}`,
        );
        continue;
      }

      // Register the command
      collection.set(command.data.name, command);
      added.push(command);
    }

    return {
      collection,
      added,
    };
  }

  initialize = (moduleDirectories: Directories) => {
    const jobsCollection = new Collection<string, Job>();
    const listenersCollection = new Collection<string, ClientEventListener>();
    const autoCompletesCollection = new Collection<
      string,
      AutoCompleteOption
    >();
    const chatInputsCollection = new Collection<string, ChatInputCommand>();
    const userContextMenusCollection = new Collection<
      string,
      UserContextCommand
    >();
    const messageContextMenusCollection = new Collection<
      string,
      MessageContextCommand
    >();
    const componentCommandsCollection = new Collection<
      string,
      ComponentCommandBase
    >();

    const dirArr =
      typeof moduleDirectories === 'string'
        ? [moduleDirectories]
        : moduleDirectories;

    const invalidModuleError = (moduleDirectory: string) =>
      `Failed to load module "${FileUtils.relativeProjectPath(moduleDirectory)}", are you sure the module is correctly exported?`;

    for (const moduleDirectory of dirArr) {
      const modules = FileUtils.getDirectories(moduleDirectory);
      for (const mod of modules.filter(
        (m) => !FileUtils.fileNameFromPath(m).startsWith('.'),
      )) {
        this.client.logger.debug(
          `Loading module: ${FileUtils.relativeProjectPath(mod)}`,
        );

        let index;
        try {
          index = require(path.resolve(moduleDirectory, mod));
        } catch (error) {
          this.client.logger.error(invalidModuleError(mod));
          continue;
        }

        if (!('default' in index)) {
          this.client.logger.error(invalidModuleError(mod));
          continue;
        }

        const options = index.default;

        if (!isCommandManagerCommandsOptions(options)) {
          this.client.logger.error(invalidModuleError(moduleDirectory));
          continue;
        }

        const {
          listeners,
          chatInputs,
          autoCompletes,
          userContextMenus,
          messageContextMenus,
          componentCommands,
          jobs,
          middleware,
        } = options;

        if (listeners) {
          this.directories.listeners = [
            ...this.directories.listeners,
            ...(typeof listeners === 'string' ? [listeners] : listeners),
          ];
          void this.resolveListeners(listeners, listenersCollection);
        }
        if (chatInputs) {
          this.directories.chatInputs = [
            ...this.directories.chatInputs,
            ...(typeof chatInputs === 'string' ? [chatInputs] : chatInputs),
          ];
          void this.loadCommandCollection(chatInputs, chatInputsCollection);
        }
        if (autoCompletes) {
          this.directories.autoCompletes = [
            ...this.directories.autoCompletes,
            ...(typeof autoCompletes === 'string'
              ? [autoCompletes]
              : autoCompletes),
          ];
          void this.resolveAutoCompletes(
            autoCompletes,
            autoCompletesCollection,
          );
        }
        if (userContextMenus) {
          this.directories.userContextMenus = [
            ...this.directories.userContextMenus,
            ...(typeof userContextMenus === 'string'
              ? [userContextMenus]
              : userContextMenus),
          ];
          void this.loadCommandCollection(
            userContextMenus,
            userContextMenusCollection,
          );
        }
        if (messageContextMenus) {
          this.directories.messageContextMenus = [
            ...this.directories.messageContextMenus,
            ...(typeof messageContextMenus === 'string'
              ? [messageContextMenus]
              : messageContextMenus),
          ];
          void this.loadCommandCollection(
            messageContextMenus,
            messageContextMenusCollection,
          );
        }
        if (componentCommands) {
          this.directories.componentCommands = [
            ...this.directories.componentCommands,
            ...(typeof componentCommands === 'string'
              ? [componentCommands]
              : componentCommands),
          ];
          void this.loadCommandCollection(
            componentCommands,
            componentCommandsCollection,
          );
        }
        if (jobs) {
          this.directories.jobs = [
            ...this.directories.jobs,
            ...(typeof jobs === 'string' ? [jobs] : jobs),
          ];
          void this.resolveJobs(jobs, jobsCollection);
        }
        if (middleware) {
          this.client.globalMiddleware.use(middleware);
        }
      }
    }

    this.listeners = listenersCollection;
    this.chatInput = chatInputsCollection;
    this.autoComplete = autoCompletesCollection;
    this.userContextMenus = userContextMenusCollection;
    this.messageContextMenus = messageContextMenusCollection;
    this.componentCommands = componentCommandsCollection;
    this.jobs = jobsCollection;

    return {
      listenersCollection,
      chatInputsCollection,
      autoCompletesCollection,
      userContextMenusCollection,
      messageContextMenusCollection,
      componentCommandsCollection,
      jobsCollection,
    };
  };
  resolveAutoCompletes = (
    pathOrPaths: Directories,
    collection: Collection<string, AutoCompleteOption>,
  ) => {
    const added = [];
    const resolvedDirs =
      typeof pathOrPaths === 'string' ? [pathOrPaths] : pathOrPaths;
    const allFiles = resolvedDirs.map((e) => FileUtils.getFiles(e)).flat();
    for (const filePath of allFiles) {
      const resolvedPath = path.resolve(filePath);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const handler = require(resolvedPath);
      if (!(handler.default instanceof AutoCompleteOption)) {
        this.client.logger.warn(
          `Skipping non-auto-complete file: ${FileUtils.relativeProjectPath(resolvedPath)}`,
        );
        continue;
      }
      handler.default.client = this.client;
      collection.set(handler.default.name, handler.default);
      added.push(handler.default);
    }
    return {
      collection,
      added,
    };
  };

  resolveJobs = (
    pathOrPaths: Directories,
    collection: Collection<string, Job>,
  ) => {
    const added = [];
    const resolvedDirs =
      typeof pathOrPaths === 'string' ? [pathOrPaths] : pathOrPaths;
    const allFiles = resolvedDirs.map((e) => FileUtils.getFiles(e)).flat();
    for (const filePath of allFiles) {
      const resolvedPath = path.resolve(filePath);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const handler = require(resolvedPath);
      if (!(handler.default instanceof Job)) {
        this.client.logger.warn(
          `Skipping non-job file: ${FileUtils.relativeProjectPath(resolvedPath)}`,
        );
        continue;
      }
      collection.set(handler.default.id, handler.default);
      added.push(handler.default);
    }
    return {
      collection,
      added,
    };
  };

  resolveListeners = (
    pathOrPaths: Directories,
    collection: Collection<string, ClientEventListener>,
  ) => {
    const added = [];
    const resolvedDirs =
      typeof pathOrPaths === 'string' ? [pathOrPaths] : pathOrPaths;
    const allFiles = resolvedDirs.map((e) => FileUtils.getFiles(e)).flat();
    for (const filePath of allFiles) {
      const resolvedPath = path.resolve(filePath);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const listener = require(resolvedPath);
      if (!(listener.default instanceof ClientEventListener)) {
        this.client.logger.warn(
          `Skipping non-listener file: ${FileUtils.relativeProjectPath(resolvedPath)}`,
        );
        continue;
      }
      listener.default.client = this.client;
      collection.set(listener.default.event, listener.default);
      added.push(listener.default);
      listener.default.register(this.client);
    }
    return {
      collection,
      added,
    };
  };

  fetchApplicationCommands = async (options: DeployCommandsOptions) => {
    const fetchOptions =
      options.type === 'global' ? {} : { guildId: options.guildId };
    const fetchFunction = this.client.application?.commands.fetch.bind(
      this.client.application?.commands,
    );
    if (!fetchFunction) {
      this.client.logger.warn(
        'Failed to fetch application commands, skipping command data refresh',
      );
      return;
    }
    return fetchFunction(fetchOptions);
  };

  findChangesInCommands = (
    newCommandState: APICommandData[],
    applicationCommandsFromFile: APICommandData[],
  ) => {
    const changes: {
      command: string;
      key: string;
      oldValue: unknown;
      newValue: unknown;
    }[] = [];

    const removedCommands = applicationCommandsFromFile.filter(
      (f) => !newCommandState.find((e) => e.name === f.name),
    );
    removedCommands.forEach((e) => {
      changes.push({
        command: e.name,
        key: 'removed',
        oldValue: '#Command',
        newValue: null,
      });
    });

    newCommandState.forEach((e) => {
      const match = applicationCommandsFromFile.find((f) => f.name === e.name);
      if (match) {
        const cmdChanges = ObjectUtils.diffAsChanges(
          match as GenericObject,
          e as GenericObject,
        );
        if (cmdChanges[0])
          changes.push(
            ...cmdChanges
              // Filter out subcommand(group) type changes,
              // as they are false positives
              .filter((f) => {
                const isFalsePositive =
                  (f.key === 'type' || f.key.endsWith('.type')) &&
                  (f.oldValue === ApplicationCommandOptionType.Subcommand ||
                    f.oldValue ===
                      ApplicationCommandOptionType.SubcommandGroup ||
                    f.oldValue === ApplicationCommandType.ChatInput) &&
                  f.newValue === undefined;
                if (isFalsePositive) {
                  this.client.logger.debug(
                    `Skipping false positive command change in Command "${e.name}": ${f.key}`,
                  );
                }
                return !isFalsePositive;
              })
              .map((e) => ({
                command: match.name,
                ...e,
              })),
          );
      } else
        changes.push({
          command: e.name,
          key: 'new',
          oldValue: null,
          newValue: '#Command',
        });
    });

    return changes;
  };

  resolveDeployCommandOptions = (
    guildId?: Snowflake,
  ): DeployCommandsOptions => {
    const options =
      process.env.NODE_ENV === 'production'
        ? { type: 'global', guildId }
        : guildId
          ? { type: 'development', guildId }
          : null;
    if (options === null) {
      throw new Error(
        [
          'Unable to resolve command deployment options, please check your configuration.',
          'Set either NODE_ENV to production, or provide a test server id in (client) configuration/options.',
        ].join(' '),
      );
    }
    return options as DeployCommandsOptions;
  };

  /**
   * Check if any changes have been made to the commands
   * since the last time we deployed them, and if so,
   * deploy the changes
   * @returns Wether or not the commands have been
   * deployed because of changes
   */
  refreshCommandData = async (): Promise<boolean> => {
    const { logger } = this.client;
    if (!existsSync('./data/commands')) {
      logger.info(
        [
          'Creating data/commands directory - this is used',
          'to track command changes and deploy commands automatically when they change',
        ].join(' '),
      );
      mkdirSync('./data/commands', { recursive: true });
    }

    // No options happens when in development mode without guildId
    const options = this.resolveDeployCommandOptions(
      this.client.extendedOptions.developmentServerId,
    );

    const cmdDataPath = `./data/commands/${options.type}-commands.json`;
    const applicationCommandsFromFile = existsSync(cmdDataPath)
      ? JSON.parse(readFileSync(cmdDataPath, 'utf-8'))
      : null;

    // Perform initial sync if no previous data exists
    if (!applicationCommandsFromFile) {
      logger.info(
        `No previous ${
          options.type
        } command data found, creating new data file - performing initial sync...${
          options.type === 'global'
            ? ' Global changes can take up to 1 hour to take effect'
            : ''
        }`,
      );
      const deployState = await this.deployCommands(options);
      const latestDeployCommands = deployState.commands;
      if (!deployState.success) {
        logger.warn(
          `Failed to deploy ${options.type} commands, skipping command data refresh`,
        );
        return false;
      }

      writeFileSync(
        cmdDataPath,
        JSON.stringify(
          latestDeployCommands.map((e) => {
            return {
              ...e,
              type: 'type' in e ? e.type : ApplicationCommandType.ChatInput,
            };
          }),
        ),
      );
      logger.success(
        `Initial synchronization for ${options.type} command data completed`,
      );
      return true;
    }

    const newCommandState =
      options.type === 'global'
        ? this.globalCommandData
        : this.developmentCommandData;

    const perf = async () => {
      const deployState = await this.deployCommands(options);
      const latestDeployCommands = deployState.commands;
      if (!deployState.success) {
        logger.warn(
          `Failed to deploy ${options.type} commands, skipping command data refresh, please review the data below`,
        );
        this.debugInternalCommands();
        return false;
      }

      writeFileSync(cmdDataPath, JSON.stringify(latestDeployCommands));
      return true;
    };

    const cmdChanges = this.findChangesInCommands(
      newCommandState,
      applicationCommandsFromFile,
    );

    if (cmdChanges.length === 0) {
      logger.info(
        `No changes detected in ${options.type} commands, skipping command data refresh`,
      );

      // In development mode, we should fetch our command data from the API
      // and check for changes there. As development bot accounts might be
      // used to login to multiple code-bases, we should always check for
      // changes in the API, and not just the local file.
      if (options.type === 'development') {
        const apiCmdData = await this.fetchApplicationCommands(options);
        if (apiCmdData && apiCmdData.size !== newCommandState.length) {
          logger.info(
            [
              `Detected a different number of currently registered commands (${apiCmdData.size}) than`,
              `in the codebase (${newCommandState.length}), refreshing command data...`,
              'This is a development-only check to handle multiple code-bases using the same bot account',
            ].join(' '),
          );
          return await perf();
        }
      }

      // Otherwise, no changes detected, return false
      return false;
    }

    logger.info(
      `Detected ${cmdChanges.length} changes in ${options.type} commands:`,
    );
    cmdChanges.forEach((e) => {
      logger.debug(
        `Command: ${e.command} - Key: ${e.key} - Old: ${e.oldValue} - New: ${e.newValue}`,
      );
    });

    return await perf();
  };

  /**
   * Load defined aliases for this command, does nothing if aliases array is empty
   * @returns A list of Commands that are aliases of this command
   */
  resolveAliases(command: CommandType): CommandType[] {
    const aliasCommands: CommandType[] = [];
    const { aliases } = command;
    if (aliases.length === 0) return [];

    const workingAliases = [
      ...new Set(
        aliases.filter(
          (alias) => alias.length > 0 && alias !== command.data.name,
        ),
      ),
    ];

    for (const aliasStr of workingAliases) {
      let aliasCmd: CommandType | null = null;

      // Resolve data for ChatInputCommands
      if (command instanceof ChatInputCommand) {
        const newCfg = Object.assign({}, command);
        aliasCmd = new ChatInputCommand({
          ...newCfg,
          aliases: [],
          aliasOf: command,
        });
        // Note: Without doing this, changing alias data
        // will overwrite initial/parent data as well
        const newData = Object.assign({ name: aliasStr }, command.data);
        Object.defineProperty(aliasCmd, 'data', {
          value: newData,
          writable: false,
        });
        Object.defineProperty(aliasCmd.data, 'name', {
          value: aliasStr,
          writable: false,
        });
      }

      if (!aliasCmd) {
        throw new Error(
          `Unable to create alias "${aliasStr}" command for ${command.data.name}...${command.sourceFileStackTrace}`,
        );
      }

      aliasCommands.push(aliasCmd);
    }

    // Return true if aliases were specified
    return aliasCommands;
  }

  filterByPermLevel = (
    cmd: CommandType,
    member: GuildMember | APIInteractionGuildMember | null,
    permLevel: PermLevel,
    allowMaxLevel?: PermLevel,
  ): boolean => {
    if (cmd.aliasOf) return false;
    if (!member) return cmd.permLevel === PermLevel.User;
    if (cmd.permLevel === PermLevel.User) return true;
    return (
      permLevel >= cmd.permLevel &&
      (!allowMaxLevel || cmd.permLevel <= allowMaxLevel)
    );
  };

  /**
   * Tries to display commands using Discord's built-in
   * clickable command links, uses default name if otherwise
   */
  commandLink = async (cmdName: string, subCmdName?: string) => {
    const apiCommandData = await this.commandAPIData();
    const apiCmd = apiCommandData?.find((e) => e.name === cmdName);
    if (subCmdName) {
      return apiCmd
        ? `</${cmdName} ${subCmdName}:${apiCmd.id}>`
        : `**\`/${cmdName} ${subCmdName}\`**`;
    }
    return apiCmd ? `</${cmdName}:${apiCmd.id}>` : `**\`/${cmdName}\`**`;
  };

  /**
   * Find a command by name across all command collections
   *
   * Note: Doesn't use this#apiCommands, as APICommandType doesn't
   * include ComponentCommands
   */
  commandById = (id: string | BaseInteraction) => {
    const resolvedId = typeof id === 'string' ? id : this.resolveCommandId(id);

    const tryId = (id: string) =>
      this.chatInput.find((e) => e.data.name === id) ??
      this.userContextMenus.find((e) => e.data.name === id) ??
      this.messageContextMenus.find((e) => e.data.name === id) ??
      this.componentCommands.find((e) => e.customId === id);

    let initial = tryId(resolvedId);

    // Try to resolve the command from the component handler identifier
    if (
      !initial &&
      resolvedId.indexOf(Constants.EMIT_COMPONENT_HANDLER_IDENTIFIER) > 0
    ) {
      const [tryCommandId] = resolvedId.split(
        Constants.EMIT_COMPONENT_HANDLER_IDENTIFIER,
      ) as [string];
      initial = tryId(tryCommandId);
    }

    return initial;
  };

  resolveCommandId = (interaction: BaseInteraction): string =>
    interaction.isChatInputCommand() || interaction.isContextMenuCommand()
      ? interaction.commandName
      : interaction.isAutocomplete()
        ? interaction.options.getFocused(true).name
        : interaction.isMessageComponent() || interaction.isModalSubmit()
          ? interaction.customId
          : interaction.id;
}
