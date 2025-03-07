import { createHash } from 'crypto';
import {
  APIInteractionGuildMember,
  BaseInteraction,
  Collection,
  Colors,
  EmbedBuilder,
  GuildMember,
  InteractionReplyOptions,
  PermissionResolvable,
  PermissionsBitField,
} from 'discord.js';
import path from 'path';
import {
  ChatInputCommand,
  ComponentCommandBase,
  IRequiredResources,
  MessageContextCommand,
  RequiredResources,
  UserContextCommand,
  isComponentCommand,
} from '.';
import {
  CommandCooldownType,
  CommandThrottle,
  CommandThrottleOptions,
  cooldownResourceId,
  throttleFromCache,
  throttleTTLCache,
} from './cooldown';
import { Client, defaultEmojis } from 'lib/client';
import {
  CommandMiddleware,
  CommandMiddlewareContext,
  CommandMiddlewareMetaContext,
  CommandMiddlewareOptions,
} from 'lib/middleware';
import { CommandManager, PermLevel } from 'lib/managers';
import {
  FileUtils,
  InteractionReplyDynamicOptions,
  InteractionUtils,
  PermissionUtils,
  TimeUtils,
} from 'lib/utils';
import { DiscordLogger } from 'lib/logger';

export type CommandType =
  | ComponentCommandBase
  | ChatInputCommand
  | UserContextCommand
  | MessageContextCommand;

export type APICommandType =
  | ChatInputCommand
  | UserContextCommand
  | MessageContextCommand;

export const isCommand = (
  item: unknown,
): item is
  | ComponentCommandBase
  | ChatInputCommand
  | UserContextCommand
  | MessageContextCommand => {
  return (
    item instanceof ComponentCommandBase ||
    item instanceof ChatInputCommand ||
    item instanceof MessageContextCommand ||
    item instanceof UserContextCommand
  );
};

export const isDataBasedCommand = (item: unknown): item is APICommandType =>
  item instanceof ChatInputCommand ||
  item instanceof UserContextCommand ||
  item instanceof MessageContextCommand;

export const DEFAULT_SOURCE_FILE_STRING = 'uninitialized/ghost command';

export type RunFunction<I extends BaseInteraction = BaseInteraction> = (
  /** The client that received this interaction */
  client: Client<true>,
  /** The interaction that triggered this command#run */
  interaction: I,
) => Promise<unknown> | unknown;

/**
 * Represents a client command configuration object
 */
export interface BaseCommandOptions<
  I extends BaseInteraction = BaseInteraction,
> {
  /**
   * The permission level required to use the command
   *
   * If higher than or equal to Administrator, `data#setDefaultMemberPermissions(0)`
   * is automatically called if not explicitly set
   * @default PermLevel.User
   */
  permLevel?: keyof typeof PermLevel | PermLevel;
  /**
   * Permissions required by the client to execute the command
   */
  clientPerms?: PermissionResolvable[];
  /**
   * Permissions required by the user to execute the command
   */
  userPerms?: PermissionResolvable[];
  /**
   * Represents a list of required resource IDs for a command
   *
   * These are used to restrict command usage to specific resources,
   * which is especially useful for private bots/functionality
   *
   * Every parameter represents a oneOf list of IDs of which AT LEAST ONE is required to match
   * If multiple parameters are provided, all of them must match
   *
   * Internal permissions and availability/constraint checks still apply
   *
   * - guilds: Requires command to be executed in one of the provided guilds
   * - channels: Requires command to be executed in one of the provided channels
   * - roles: Requires command executor to have one of the provided roles
   * - users: Requires command executor to be one of the provided users
   * - categories: Requires command channel parent to be one of the provided categories
   */
  requiredResourceIds?: Partial<IRequiredResources>;
  /**
   * Is the command currently disabled? If so - it won't be available anywhere.
   * Late API updates (users that see the command in their command
   * overview after the API data update) are accounted for
   * @default false
   */
  disabled?: boolean;
  /**
   * Is the command Not Safe For Work? If it is, it will only be available
   * in channels that have the NSFW-flag set enabled
   * @default false
   */
  nsfw?: boolean;
  /**
   * Command cooldown/throttling configuration to apply to this command
   *
   * Note: This is NOT persistent, for that, you should use your own
   * persistent cooldown middleware
   */
  cooldown?: CommandThrottleOptions;
  /**
   * This command's category, if omitted, the command's origin file's parent folder name will be parsed and used
   * @default 'file parent folder name'
   */
  category?: string | null;
  /**
   * Is this command only available in guilds/servers, or also in DMs?
   * You should use `InteractionUtils.requireAvailableGuild` in your
   * command/controller to assert the interaction type
   * @default true
   */
  guildOnly?: boolean;
  /**
   * Tries to (defer, edit, followUp, etc.) reply ephemerally if possible
   */
  isEphemeral?: boolean;
  /**
   * Defers the reply to `run` interactions internally if possible
   */
  deferReply?: boolean;
  /**
   * Represents a list of commands that are identical to the original command, with different names
   */
  aliases?: string[];
  /**
   * Represents the command this command is an alias of
   */
  aliasOf?: CommandType | null;
  /**
   * The function to run when the command is executed
   */
  run: RunFunction<I>;
  /**
   * Middleware for this command
   *
   * @example
   * ```typescript
   * import { ChatInputMiddlewareFunction } from '../middleware/CommandMiddleware';
   *
   * const requireDJRole: ChatInputMiddlewareFunction = async ({
   *   next,
   *   client,
   *   command,
   *   interaction,
   *   previousResult,
   *   nextMiddleware,
   *   previousMiddleware,
   * }) => {
   *   // Do something with available Context
   *   next(); // Only continue to next middleware if next is called
   * };
   *
   * export default new ChatInputCommand({
   *  deferReply: true, // You should defer replies ASAP if you're using async middleware
   *  permLevel: PermLevel.Developer,
   *  middleware: [ requireDJRole ],
   *  // OR
   *  middleware: {
   *   preRunChecks: [ requireDJRole ],
   *   // Etc.
   *  }
   * })
   * ```
   */
  // middleware?(): CommandMiddlewareOptions<
  //   I,
  //   Command,
  //   CommandMiddlewareContext<I, Command>
  // >;
  // | CreateMiddleware<CommandMiddlewareContext<I, Command>>
  middleware?: CommandMiddlewareOptions<I, CommandMiddlewareContext<I>>;
  // | CreateMiddleware<CommandMiddlewareContext<I, Command>>[];
}

export interface ComponentCommandData {
  /** The name of the component - alias of customId */
  name: string;
}

/**
 * Represents the base class used for all our commands & components
 * */
export class BaseCommand<I extends BaseInteraction = BaseInteraction> {
  client?: Client;
  collection?: Collection<string, CommandType>;
  manager?: CommandManager;
  permLevel: PermLevel = PermLevel.User;
  clientPerms = [];
  userPerms = [];
  requiredResourceIds: RequiredResources<I> = new RequiredResources<I>({});
  disabled = false;
  nsfw = false;
  cooldown;
  category: string | null = null;
  guildOnly = true;
  isEphemeral = false;
  deferReply = false;
  run: RunFunction<I>;
  data: ComponentCommandData = { name: '' };
  middleware: CommandMiddleware<I, CommandMiddlewareContext<I>>;
  sourceHash = DEFAULT_SOURCE_FILE_STRING;
  sourceFile = DEFAULT_SOURCE_FILE_STRING;
  sourceFileStackTrace = DEFAULT_SOURCE_FILE_STRING;
  private _initialized = false;
  get initialized() {
    return this._initialized;
  }

  /**
   * Represents a list of commands that are identical to the original command, with different names
   */
  aliases: string[] = [];
  /**
   * Represents the command this command is an alias of
   */
  aliasOf: CommandType | null = null;

  constructor(
    options: BaseCommandOptions<I>,
    client?: Client,
    manager?: CommandManager,
  ) {
    if (client) this.client = client;
    if (manager) this.manager = manager;
    this.run = options.run;

    // Overwrite defaults
    Object.assign(this, options);

    // Resolve RequiredResources
    if (options.requiredResourceIds instanceof RequiredResources) {
      this.requiredResourceIds = options.requiredResourceIds;
    } else
      this.requiredResourceIds = new RequiredResources(
        options.requiredResourceIds ?? {},
      );

    // Resolve cooldown
    if (options.cooldown instanceof CommandThrottle) {
      this.cooldown = options.cooldown;
    } else
      this.cooldown = new CommandThrottle(
        options.cooldown ?? this.client?.defaultCommandThrottling ?? {},
      );

    // Resolve middleware
    this.middleware = new CommandMiddleware(options.middleware ?? {});
  }

  initialize(originPath: string) {
    this.sourceFile = originPath;
    this.sourceHash = createHash('sha256')
      .update(FileUtils.fileNameFromPath(this.sourceFile))
      .digest('hex');
    this.sourceFileStackTrace = `\n    at ${this.sourceFile}`;
    this._initialized = true;
  }

  unInitialize() {
    this._initialized = false;
    this.sourceFile = DEFAULT_SOURCE_FILE_STRING;
    this.sourceHash = DEFAULT_SOURCE_FILE_STRING;
    this.sourceFileStackTrace = DEFAULT_SOURCE_FILE_STRING;
  }

  load(cmdPath: string, client: Client, manager: CommandManager): boolean {
    // Initialize the command after all our checks have passed
    // Before alias check
    // After resolving name overwrite
    this.initialize(cmdPath);

    // Resolve name - default is file name
    let cmdName = path.basename(cmdPath, path.extname(cmdPath));
    this.client = client;
    this.manager = manager;

    // Destructure now that we know we're dealing with a Command
    // Component commands don't have a data object - they're components
    // like buttons, modals, etc.
    if (isDataBasedCommand(this)) {
      // Overwrite name, and update reference if applicable
      const { name } = this.data;
      if (name) cmdName = name;
      if (!this.data.name) {
        // Uses controller setup
        if (cmdName === 'index') {
          if (!this.category) {
            const cmdPathUpperParentFolder = path.basename(
              path.dirname(cmdPath.slice(0, cmdPath.lastIndexOf('/index'))),
            );
            this.category = cmdPathUpperParentFolder;
          }

          const cmdPathParentFolder = path.basename(path.dirname(cmdPath));
          this.data.setName(cmdPathParentFolder);
        } else {
          this.data.setName(cmdName);
        }
      }

      this.registerLocalizations(this);

      if (this instanceof ChatInputCommand) {
        if (
          this.permLevel >= PermLevel.Administrator &&
          this.client.extendedOptions.defaultLockMemberPermissions &&
          'default_member_permissions' in this.data &&
          typeof this.data.default_member_permissions === 'undefined'
        )
          this.data.setDefaultMemberPermissions(0);

        this.data.setNSFW(this.nsfw);
        // Skip if we're missing required description
        if (!this.data.description) {
          client.logger.warn(
            `ChatInputCommand "${cmdName}" has no description, skipping...${this.sourceFileStackTrace}`,
          );
          this.unInitialize();
          return false;
        }
      }
    }

    // Resolve category - default is parent folder name - after name
    const cmdPathParentFolder = path.basename(path.dirname(cmdPath));
    if (!this.category) this.category = cmdPathParentFolder;

    return true;
  }

  resolveLocalizations = (
    cmdName: string,
    cmdLocalizationKey: 'name' | 'description',
  ) => {
    if (!this.client) return null;
    const { I18N, locales } = this.client;

    // Resolve key localizations
    const enName: string = I18N.t(`commands:${cmdName}.${cmdLocalizationKey}`, {
      defaultValue: '',
    });
    if (enName.length >= 0) {
      const commandLocales = locales
        .map((locale) => [
          locale,
          // Note: client NS
          I18N.t(`commands:${cmdName}.${cmdLocalizationKey}`, {
            lng: locale,
            defaultValue: enName,
          }),
        ])
        .filter(([locale, val]) => locale && val);
      if (commandLocales[0]) return Object.fromEntries(commandLocales);
      else return null;
    }
  };

  resolveNameLocalizations = (cmdName: string) =>
    this.resolveLocalizations(cmdName, 'name');

  resolveDescriptionLocalizations = (cmdName: string) =>
    this.resolveLocalizations(cmdName, 'description');

  registerLocalizations = (cmdInstance: APICommandType) => {
    // Resolve name localization
    const nameLocalization = cmdInstance.resolveNameLocalizations(
      cmdInstance.data.name,
    );
    if (nameLocalization) {
      cmdInstance.data.setNameLocalizations(nameLocalization);
      const defaultLocalization = nameLocalization['en-GB'];
      if (!cmdInstance.data.name && defaultLocalization)
        cmdInstance.data.setName(defaultLocalization);
    }

    // Resolve description localization
    if (cmdInstance instanceof ChatInputCommand) {
      const descriptionLocalization =
        cmdInstance.resolveDescriptionLocalizations(cmdInstance.data.name);
      if (descriptionLocalization) {
        cmdInstance.data.setDescriptionLocalizations(descriptionLocalization);
        const defaultLocalization = descriptionLocalization['en-GB'];
        if (!cmdInstance.data.description && defaultLocalization)
          cmdInstance.data.setDescription(defaultLocalization);
      }
    }
  };

  /**
   * Defers the reply to `run` interactions internally if possible
   */
  deferReplyInternal = async (interaction: BaseInteraction) => {
    if (
      interaction.isRepliable() &&
      !interaction.replied &&
      !interaction.deferred
    )
      await interaction.deferReply({ ephemeral: this.isEphemeral });
  };

  /**
   * Convenience method to reply to an interaction and set
   * ephemeral state dynamically - it's nice not having to
   * boilerplate import everywhere
   */
  reply = async (
    interaction: I,
    content: InteractionReplyOptions | EmbedBuilder | string,
    options: InteractionReplyDynamicOptions = {},
  ) => {
    if (!this.client)
      throw new Error(
        `Command ${this.data.name} has no client, but is trying to reply to an interaction`,
      );
    const resolvedContent =
      content instanceof EmbedBuilder
        ? { embeds: [content] }
        : typeof content === 'string'
          ? { content }
          : content;
    resolvedContent.ephemeral = this.isEphemeral;
    return InteractionUtils.replyDynamic(
      this.client,
      interaction,
      resolvedContent,
      options,
    );
  };

  matchEnabledConstraints = (interaction: I, client: Client): boolean => {
    if (this.disabled) {
      void InteractionUtils.replyDynamic(client, interaction, {
        content: client.I18N.t('lib:commands.commandDisabledTitle'),
        ephemeral: true,
      });
      return false;
    }
    return true;
  };

  hasAccessToUserComponent = (interaction: I) => {
    // Skip if we're not dealing with a component command
    if (!interaction.isMessageComponent()) return true;

    // Destructure from our received interaction
    const { member, message } = interaction;

    // Check if the component was created outside of interaction context
    // which means the component should be available to everyone
    // e.g. a button that is created in a message, but not in a slash command
    if (!message?.interaction) return true;

    // Return as a boolean
    const originInteractionUserId = message.interaction.user?.id;

    return member?.user.id === originInteractionUserId;
  };

  matchDMConstraints = (interaction: I, client: Client): boolean => {
    // Skip if we're dealing with a AutoComplete queries
    // These are directly linked to a command, and are not standalone
    if (interaction.isAutocomplete()) return true;

    // Restrict DM usage if applicable
    if (!interaction.inGuild() && this.guildOnly) {
      void InteractionUtils.replyDynamic(client, interaction, {
        content: client.I18N.t('lib:commands.notAvailableInDMs'),
        ephemeral: true,
      });
      return false;
    }
    return true;
  };

  matchDiscordPermConstraints = (
    interaction: I,
    client: Client,
    targetMember: GuildMember | APIInteractionGuildMember,
    perms: PermissionsBitField[],
  ): boolean => {
    const { channel } = interaction;

    // Not sure how/when this could happen, but
    // If we can't SEE if a channel's permissions match,
    // we can't determine if the command should execute
    // so we shouldn't allow it
    if (!channel) {
      void InteractionUtils.replyDynamic(client, interaction, {
        content: client.I18N.t('lib:commands.noChannelForPermissionCheck'),
      });
      return false;
    }

    // In DM's, both the user and the bot have all permissions
    // for possible actions
    if (channel.isDMBased()) {
      return true;
    }

    const hasChannelPerms =
      channel.permissionsFor(targetMember.user.id)?.has(perms) ?? false;
    if (!hasChannelPerms) {
      const isClient = targetMember.user.id === interaction.client.user.id;
      const msg = isClient
        ? client.I18N.t('lib:commands.clientMissingPermissions')
        : client.I18N.t('lib:commands.userMissingPermissions');
      void InteractionUtils.replyDynamic(client, interaction, {
        content: msg,
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            // Note: Internally, for errors, we should use red
            // instead of the default or user config color
            .setColor(Colors.Red)
            .setDescription(
              `${client.I18N.t('lib:commands.missingPermissions')}: \`${channel
                .permissionsFor(targetMember.user.id)
                ?.missing(perms)
                .join(', ')}\``,
            ),
        ],
      });
      return false;
    }

    return true;
  };

  matchComponentOriginConstraints = (
    interaction: I,
    client: Client,
  ): boolean => {
    if (
      isComponentCommand(this) &&
      this.isUserComponent &&
      !this.hasAccessToUserComponent(interaction)
    ) {
      void InteractionUtils.replyDynamic(client, interaction, {
        embeds: [
          client.embeds.error({
            title: client.I18N.t('lib:invalidUser'),
            description: client.I18N.t('lib:commands.isNotComponentUser'),
          }),
        ],
        ephemeral: true,
      });
      return false;
    }
    return true;
  };

  matchPermLevelConstraints = async (
    client: Client<true>,
    interaction: I,
  ): Promise<false | PermLevel> => {
    const permLevel = await PermissionUtils.resolveMemberPermLevel(
      client,
      interaction.member,
      interaction.guild,
    );
    if (permLevel < this.permLevel) {
      void InteractionUtils.replyDynamic(client, interaction, {
        content: client.I18N.t('lib:commands.permLevelTooLow'),
        ephemeral: true,
      });
      return false;
    }
    return permLevel;
  };

  matchNSFWConstraints = (interaction: I, client: Client): boolean => {
    if (!this.nsfw) return true;
    const { channel } = interaction;

    // Not sure how/when this could happen, but
    // If we can't SEE if a channel is NSFW, we can't
    // determine if the command should execute, so
    // we shouldn't allow it
    if (!channel) {
      void InteractionUtils.replyDynamic(client, interaction, {
        content: client.I18N.t('lib:commands.noChannelForNSFWCheck'),
        ephemeral: true,
      });
      return false;
    }

    // In DM's, there's no option to make chats NSFW
    // They'll always open without warning, so deny
    if (channel.isDMBased()) {
      void InteractionUtils.replyDynamic(client, interaction, {
        content: client.I18N.t('lib:commands.noNSFWInDM'),
        ephemeral: true,
      });
      return false;
    }

    // Threads can NOT be marked as NSFW
    if (channel.isThread()) {
      void InteractionUtils.replyDynamic(client, interaction, {
        content: client.I18N.t('lib:commands.noNSFWInThread'),
        ephemeral: true,
      });
      return false;
    }

    // If the channel is not NSFW, deny execution
    if (!channel.nsfw) {
      void InteractionUtils.replyDynamic(client, interaction, {
        content: client.I18N.t('lib:commands.noNSFWInSFWChannel'),
        ephemeral: true,
      });
      return false;
    }

    return true;
  };

  matchPermissionConstraints = (interaction: I, client: Client): boolean => {
    // Next, check Discord permissions
    // Skip if we're in DM's
    if (!interaction.inGuild()) return true;

    // Check client perms
    const hasUserPerms = this.userPerms.length >= 1;
    if (
      hasUserPerms &&
      !this.matchDiscordPermConstraints(
        interaction,
        client,
        interaction.member,
        this.userPerms,
      )
    )
      return false;

    // No need to check guild permissions if we're in DM's
    // but DM functionality is also limited
    if (!interaction.inGuild()) return true;

    // We can't check permissions for the client if we
    // don't have a guild, so skip if we don't have one
    if (!interaction.inCachedGuild()) return false;

    // Check client/bot perms
    const hasClientPerms = this.clientPerms.length >= 1;
    if (hasClientPerms) {
      // Make sure we have a client member reference
      const me = interaction.guild.members.me;
      if (!me) {
        void InteractionUtils.replyDynamic(client, interaction, {
          content: `${client.I18N.t('lib:commands.clientMissingPermissions')}\n\n${this.clientPerms
            .map(
              (e) =>
                `${this.client?.clientEmojis.error ?? defaultEmojis} \`${e}\``,
            )
            .join(', ')}`,
          ephemeral: true,
        });
        return false;
      }

      // Normal bot + guild permission check
      if (
        !this.matchDiscordPermConstraints(
          interaction,
          client,
          me,
          this.clientPerms,
        )
      ) {
        return false;
      }
    }

    return true;
  };

  /**
   * Make sure the command matches all constraints - things like
   * required Discord permissions, internal permissions, NSFW channels, etc.
   * @returns True if the command matches all constraints (should execute), false otherwise
   */
  matchConstraints = async (
    interaction: I,
    client: Client<true>,
    cmdContext: CommandMiddlewareMetaContext,
  ): Promise<boolean> => {
    // Make sure the command is enabled
    if (!this.matchEnabledConstraints(interaction, client)) return false;

    // Perform required internal checks
    // First check is internal permission level -
    // they don't have to know anything about the
    // command if they don't have permission
    const permLevel = await this.matchPermLevelConstraints(client, interaction);
    if (permLevel === false) return false;

    if (!this.matchComponentOriginConstraints(interaction, client))
      return false;

    // Additional (meta) checks
    if (!this.matchDMConstraints(interaction, client)) return false;

    // Check Discord permissions
    if (!this.matchPermissionConstraints(interaction, client)) return false;

    // NSFW should only ever be relevant after we
    // establish they have permission to use this command.
    // The only drawback here is that owners/admins
    // might try to resolve permissions, only to
    // find out the command is NSFW
    if (!this.matchNSFWConstraints(interaction, client)) return false;

    // Require additional resources to match
    if (!this.requiredResourceIds.match(client, interaction, true))
      return false;

    // Throttling is async, let's try to defer
    // our reply with as many user input as possible
    if (this.cooldown.enabled) {
      const { middleware } = this;
      const middlewareContext = {
        client,
        interaction,
        ...cmdContext,
      };
      if (
        !(await client.globalMiddleware.runMiddleware(
          middlewareContext,
          client.globalMiddleware.preRunThrottle,
        ))
      )
        return false;
      if (
        !(await middleware.runMiddleware(
          middlewareContext,
          middleware.preRunThrottle,
        ))
      )
        return false;

      // Should only apply to "successful" commands -
      // otherwise failed-constraints commands will
      // consume throttle points
      if (permLevel <= PermLevel['Server Owner']) {
        const isOnCooldown = this.throttleUsage(interaction, client);
        if (isOnCooldown) return false;
      }
    }

    return true;
  };

  handleInteraction = async (
    interaction: I,
    client: Client<true>,
    cmdContext: CommandMiddlewareMetaContext,
  ): Promise<boolean> => {
    // Initialize middleware
    const { middleware } = this;
    const middlewareContext = {
      client,
      interaction,
      ...cmdContext,
    };

    // Allow opt-in to defer reply internally consistently
    // Should be called before any middleware to account
    // for asynchronous middleware
    if (this.deferReply) await this.deferReplyInternal(interaction);

    // Pre-run middleware
    if (
      !(await client.globalMiddleware.runMiddleware(
        middlewareContext,
        client.globalMiddleware.preRunChecks,
      ))
    )
      return false;
    if (
      !(await middleware.runMiddleware(
        middlewareContext,
        middleware.preRunChecks,
      ))
    )
      return false;

    // Make sure we can execute the command
    // If false, method will send a message to the user
    // internally about why the command cannot be executed
    const shouldExecute = await this.matchConstraints(
      interaction,
      client,
      cmdContext,
    );
    if (!shouldExecute) return false;

    // Pre-run middleware
    if (
      !(await client.globalMiddleware.runMiddleware(
        middlewareContext,
        client.globalMiddleware.preRunExecution,
      ))
    )
      return false;
    if (
      !(await middleware.runMiddleware(
        middlewareContext,
        middleware.preRunExecution,
      ))
    )
      return false;

    // Run/execute the command
    const tryRunResult = await DiscordLogger.tryWithErrorLogging(
      client,
      () => this.run.call(this, client, interaction),
      'An error occurred while running a command',
    );

    // Post-run middleware, and return-value middleware
    const withResultMiddlewareContext = {
      ...middlewareContext,
      ...tryRunResult,
    };
    if (
      !(await client.globalMiddleware.runMiddleware(
        withResultMiddlewareContext,
        client.globalMiddleware.postRunExecution,
      ))
    )
      return false;
    if (
      !(await middleware.runMiddleware(
        withResultMiddlewareContext,
        middleware.postRunExecution,
      ))
    )
      return false;

    // Run middleware for specific cmd#run return values
    await client.globalMiddleware.runMiddleware(
      withResultMiddlewareContext,
      client.globalMiddleware.runExecutionReturnValues
        .filter((e) => e.value === tryRunResult.data)
        .flatMap((e) => e.middleware),
    );
    await middleware.runMiddleware(
      middlewareContext,
      middleware.runExecutionReturnValues
        .filter((e) => e.value === tryRunResult.data)
        .flatMap((e) => e.middleware),
    );

    return true;
  };

  /**
   * Throttle command usage, make sure we don't exceed the command's
   * configured cooldown
   * @returns Wether or not the command is on cooldown for this interaction
   */
  throttleUsage = (interaction: I, client: Client): boolean => {
    // Unique file hash, allow e.g. button and modal named "test"
    // This also means aliases are accounted for - yay!
    const now = Date.now();
    const { cooldown } = this;
    const resourceId = cooldownResourceId(cooldown.type, interaction);
    const throttleId = `${this.sourceHash}@${resourceId}`;
    const durationInMS = cooldown.duration;
    const throttleEntry = throttleFromCache(throttleId) ?? {
      id: throttleId,
      throttleId,
      duration: durationInMS,
      usages: [],
    };
    const nonExpiredUsages = throttleEntry.usages.filter(
      (e) => e.valueOf() + durationInMS > now,
    );
    const activeUsages = nonExpiredUsages.length;

    const firstNonExpired = nonExpiredUsages[0];
    if (firstNonExpired && activeUsages >= cooldown.usages) {
      const firstUsageExpires = new Date(
        firstNonExpired.valueOf() + durationInMS,
      );
      const remaining = firstUsageExpires.valueOf() - now;
      const expiresIn = TimeUtils.msToHumanReadableTime(remaining);
      const relativeOutput = expiresIn === '0 seconds' ? '1 second' : expiresIn;
      void InteractionUtils.replyDynamic(client, interaction, {
        content: client.I18N.t('lib:commands.onCooldown', {
          type: CommandCooldownType[cooldown.type],
          expiresIn: relativeOutput,
        }),
        ephemeral: true,
      });
      return true;
    }

    throttleEntry.usages.push(new Date(now));
    throttleTTLCache.set(throttleId, throttleEntry, durationInMS);

    return false;
  };
}
