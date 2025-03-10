import type { PresenceStatusData, Snowflake } from 'discord.js';
import type { CommandCooldownType, IColors, IEmojis, UserColors } from '@lib';

/**
 * Represents essential options to configure clustering & sharding
 *
 * Unfortunately we still can't use this to generate
 * our json schema as it's not supported by the generator (bigint)
 */
// export type RequiredClusterManagerOptions = Required<Pick<
//   ClusterManagerOptions,
//   'token' | 'totalShards' | 'mode' | 'respawn' | 'shardsPerClusters'
// >> & Pick<ClusterManagerOptions, 'totalClusters' | 'spawnOptions' | 'restarts'>;

export interface IClusterRestartOptions {
  /** Maximum amount of restarts a cluster can have in the interval */
  max: number;
  /** Interval in milliseconds on which the current restarts amount of a cluster will be reset */
  interval: number;
}

export interface IClusterManagerOptions {
  /** Is clustering enabled */
  enabled: boolean;
  /** Total amount of shards to spawn, use null for auto */
  total_shards: number | null;
  /** Amount of shards per cluster */
  shards_per_clusters: number;
  /** Amount of clusters to spawn, use null for auto */
  total_clusters: number | null;
  /** Mode to spawn clusters in */
  mode: 'worker' | 'process';
  /** Should the process respawn on exit */
  respawn: boolean;
  /** Additional cluster restart options */
  restarts: IClusterRestartOptions;
}

export interface IClientAPI {
  /** Whether the API should be enabled */
  enabled: boolean;
  /**
   * Which port the server application should run on, between `0` and `65535` (disabled if `null`)
   *
   * Note: Port range `[0-1024]` should be considered reserved as they're well-known ports,
   * these require SuperUser/Administrator access
   *
   * Note: Port range `[49152-65535]` should be considered reserved for Ephemeral Ports
   * (Unix based devices, configurable)
   *
   * Reference: {@link https://www.ncftp.com/ncftpd/doc/misc/ephemeral_ports.html}
   */
  port: number | null;
}

/** Available runtime environments */
export type NodeEnvValues = 'production' | 'development' | 'staging';

export interface UserConfigOptions extends OptionalUserConfig {
  /** JSON schema used for validation and type-ahead/Intellisense, you should never change this */
  readonly $schema: string;
  api: IClientAPI;
  /** Client internal permission level configuration */
  permissions: IPermissions;
  /** Discord client/bot configuration for this instance */
  client: IClient;
  /** Default command throttle configuration */
  cooldown: ICommandCooldown;
  /**
   * Change the entry file of this application to
   * further fine-tune sharding and clustering settings
   */
  cluster: IClusterManagerOptions;
}

export type FullUserConfigOptions = UserConfigOptions &
  Required<{
    debug: Required<IDebug>;
    colors: Required<IColors>;
    emojis: Required<IEmojis>;
  }>;

export interface OptionalUserConfig {
  /** Debug configuration for this instance, useful for developers */
  debug?: Partial<IDebug>;
  /** Color customization for embeds, and other user feedback/interactions */
  colors?: Partial<IColors>;
  /** Emoji customization for embeds, and other user feedback/interactions */
  emojis?: Partial<IEmojis>;
  /** URL configuration for the client */
  urls?: Partial<URLOptions>;
  /** File logging (winston) configuration */
  logging?: Partial<LoggingOptions>;
  // Note: We need the relative path to the client/commands directory
  // between ts-node-dev and tsc, so we need path.relative for
  // directory structure - can't be provided in user json file
  // Instead, use in client options only
  /** Configure the project/application structure */
  // PROJECT_STRUCTURE?: IProjectStructure;
}

export interface LoggingOptions {
  /** Whats the max size of a file before it should rotate */
  max_size?: string;
  /** Whats the max amount of files to keep before deleting the oldest */
  max_files?: string;
  /** Should rotated log files be archived, instead of deleted? */
  zipped_archive?: boolean;
  /** What directory should log files be stored in? */
  directory?: string;
  /** What date pattern should be used for log file names */
  date_pattern?: string;
  /** Should there be a combined log file that holds everything? */
  combined_logging?: boolean;
  /** Should there be an error log file? */
  error_logging?: boolean;
  /** Should there be a warning log file? */
  warn_logging?: boolean;
  /** Should there be an info log file? */
  info_logging?: boolean;
  /** Should there be an http log file? */
  http_logging?: boolean;
  /** Should there be a verbose log file? */
  verbose_logging?: boolean;
  /** Should there be a debug log file? */
  debug_logging?: boolean;
  /** Should there be a silly log file? */
  silly_logging?: boolean;
}

export interface IPermissions {
  /** The bot owner's Discord user id - represents the highest permission level */
  owner_id: Snowflake;
  /** Array of Discord user id's that have the Developer permission level */
  developer_ids: Snowflake[];
  /**
   * Array of Discord user id's that should be able to manage
   * the bot - like restarting, viewing logs, audits, etc.
   */
  system_administrator_ids: Snowflake[];
  /**
   * If a command has a permission level of Administrator, should we
   * automatically hide that command from non-Administrator users, by using
   * `#setDefaultMemberPermissions(0)` on the command?
   */
  default_lock_member_permissions: boolean;
}

export interface IClient {
  /** This client's application/user ID. You can get one here: https://discord.com/developers/applications */
  id: Snowflake;
  /** The secret token used to log in to this bot account. You can get one here: https://discord.com/developers/applications */
  token: string;
  /** The server/guild id where test commands should be registered to - development only */
  development_server_id?: Snowflake;
  /**
   * Should we refuse, and reply to, interactions that belong to unknown commands?
   */
  refuse_unknown_command_interactions?: boolean;
  /**
   * Should we suppress warnings about unknown interactions?
   * You should enable this if you run multiple applications/processes under the
   * same bot account used for this client, or register a lot of
   * command-scoped component listeners/collectors
   */
  suppress_unknown_interaction_warnings?: boolean;
  /**
   * The id of the channel where internal errors should be logged to
   */
  error_channel_id?: Snowflake;
  /**
   * Should we log command/component usage in a Discord channel (id)?
   */
  command_usage_channel_id?: Snowflake;
  /**
   * The default client status and activities,
   * set when the client is ready. This is only
   * set once on boot, and not updated afterwards.
   */
  presence?: {
    active: boolean;
    status: PresenceStatusData;
    activities: {
      name: string;
      type:
        | 'PLAYING'
        | 'WATCHING'
        | 'LISTENING'
        | 'STREAMING'
        | 'COMPETING'
        | 'CUSTOM';
      url?: string;
    }[];
  };
}

/**
 * Represents a command throttling configuration that
 * is unique to our config.json file
 */
export interface ICommandCooldown {
  /** Whether command throttling is enabled by default */
  default_cooldown_enabled: boolean;
  /** What resource/identifier this cooldown should apply to */
  default_cooldown_type: keyof typeof CommandCooldownType;
  /** The amount of time the command can be used before being throttled */
  default_cooldown_usages: number;
  /** The duration (in ms) usages last for */
  default_cooldown_duration: number;
  /**
   * Whether the cooldown is persistent (i.e. does it persist between bot restarts)?
   * If true, uses prisma data to store cooldown (slower). If false,
   * uses internal memory TTL cache to store cooldown for as long as
   * they're relevant (faster, uses more RAM)
   */
  default_cooldown_persistent: boolean;
}

export interface URLOptions {
  /** The URL to the project repository */
  github: string;
  /** The URL to the project documentation */
  docs: string;
  /** The URL to the project website */
  website: string;
  /** The URL to the project support server */
  support_server: string;
}

export interface IDebug {
  /** Should we perform general debugging (everything that isn't specified in other options) */
  debug_mode_enabled?: boolean;
  /** Should the Discord API Command data be displayed when registering? */
  chat_input_command_api_data?: boolean;
  /** Should interaction objects be debugged when received? */
  interactions?: boolean;
  /** Should the time it takes to query auto-completes be displayed */
  autocomplete_execution_time?: boolean;
  /**
   * Should the time it takes to respond to modal submit
   * interactions be displayed? Useful because these interaction
   * can't be deferred
   */
  modal_submit_execution_time?: boolean;
  /** Should command usage throttling be debugged? */
  command_throttling?: boolean;
  /** Should language localization be debugged? */
  localizations?: boolean;
  /** Should a table with a complete overview of commands be displayed on boot? */
  command_data?: boolean;
}

export type InternalAppConfig = {
  /** Which environment are we running in resolved from cli arg .env value */
  NODE_ENV: NodeEnvValues;
  /**
   * Should we run in dry-run mode?
   * This allows to build with an example
   * JSON file, but not actually run the bot
   */
  DRY_RUN: boolean;
};

export type AppConfig = Omit<FullUserConfigOptions, 'colors'> &
  InternalAppConfig & {
    colors: UserColors;
  };
