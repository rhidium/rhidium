import './shared';

import path from 'path';
import { ClusterClient, getInfo } from 'discord-hybrid-sharding';
import {
  ActivityType,
  ClientOptions,
  GatewayIntentBits,
  PresenceData,
} from 'discord.js';
import {
  Client,
  logger,
  CommandCooldownType,
  ClientOptions as RhidiumClientOptions,
  RequiredClientOptions,
  Lang,
  locales,
  appConfig,
  permConfig,
} from '@core';
import pkg from '../../package.json';

/**
 * This is our client/bot file - it's not the entry point of our application,
 * but it's the entry point of our bot.
 * This file is spawned by the cluster manager, and is responsible for
 * initializing our client, and logging in to Discord.
 * Since we're using discord-hybrid-sharding, this file will be spawned
 * multiple times, depending on the number of shards we're using.
 * We should perform required initialization here (but also in our cluster).
 */

export const main = async () => {
  // Timestamp log start
  logger._info(Lang.t('client:initialize.start'));
  const startInitialing = process.hrtime();

  const clientOptions: ClientOptions &
    Partial<RhidiumClientOptions> &
    RequiredClientOptions<boolean> = {
    moduleDirectories: [path.resolve(__dirname, '../modules')],
    suppressVanity: false,
    // For anyone wondering, there's nothing wrong with storing
    // the token in a config file outside of the .env file,
    // as long as the file is not committed to a public repository
    // or included in build artifacts (like Docker images)
    token: appConfig.client.token,
    intents: [GatewayIntentBits.Guilds],
    applicationId: appConfig.client.id,
    errorChannelId: appConfig.client.error_channel_id ?? null,
    defaultLockMemberPermissions:
      appConfig.permissions.default_lock_member_permissions,
    refuseUnknownCommandInteractions:
      appConfig.client.refuse_unknown_command_interactions ?? false,
    suppressUnknownInteractionWarning:
      appConfig.client.suppress_unknown_interaction_warnings ?? false,
    commandUsageChannelId: appConfig.client.command_usage_channel_id ?? null,
    developmentServerId: appConfig.client.development_server_id,
    shards: appConfig.cluster.enabled
      ? (getInfo()?.SHARD_LIST ?? 'auto')
      : 'auto',
    shardCount: appConfig.cluster.enabled ? (getInfo()?.TOTAL_SHARDS ?? 1) : 1,
    defaultCommandThrottling: {
      duration: appConfig.cooldown.default_cooldown_duration,
      enabled: appConfig.cooldown.default_cooldown_enabled,
      persistent: appConfig.cooldown.default_cooldown_persistent,
      type: appConfig.cooldown.default_cooldown_type
        ? CommandCooldownType[appConfig.cooldown.default_cooldown_type]
        : CommandCooldownType.User,
      usages: appConfig.cooldown.default_cooldown_usages,
    },
    internalPermissions: clientPermissions!,
    logging: clientLoggingConfig!,
    colors: appConfig.colors,
    emojis: appConfig.emojis,
    debug: clientDebugging!,
    I18N: Lang,
    locales,
    pkg,
  };

  // Conditional client options
  if (appConfig.client.presence?.active)
    clientOptions.presence = clientPresence;

  // Initialize our client - scoped because of clustering
  // It looks like a lot boilerplate, but we only have few
  // required options and can opt-into a lot of powerful features
  const client = new Client(clientOptions);

  // Log debug and warning messages
  if (appConfig.debug.debug_mode_enabled) {
    client.on('debug', console.debug).on('warn', console.warn);
    client.rest.on('rateLimited', (d) => console.warn(d));
  }

  // Initialize our cluster if we're using one
  if (appConfig.cluster.enabled) client.cluster = new ClusterClient(client);

  // Timestamp log finished initializing
  const endInitializing = client.logger.consoleExecutionTime(startInitialing);
  client.logger.success(
    Lang.t('client:initialize.success', {
      commandSize: client.commandManager.commandSize,
      duration: endInitializing,
    }),
  );

  // Log in to our client
  await client.login(appConfig.client.token);
};

export const clientLoggingConfig: Client['extendedOptions']['logging'] = {
  directory: appConfig.logging?.directory,
  maxFiles: appConfig.logging?.max_files,
  maxSize: appConfig.logging?.max_size,
  datePattern: appConfig.logging?.date_pattern,
  zippedArchive: appConfig.logging?.zipped_archive,
  combinedLogging: appConfig.logging?.combined_logging,
  errorLogging: appConfig.logging?.error_logging,
  warnLogging: appConfig.logging?.warn_logging,
  infoLogging: appConfig.logging?.info_logging,
  httpLogging: appConfig.logging?.http_logging,
  verboseLogging: appConfig.logging?.verbose_logging,
  debugLogging: appConfig.logging?.debug_logging,
  sillyLogging: appConfig.logging?.silly_logging,
};

export const clientPermissions: Client['extendedOptions']['internalPermissions'] =
  {
    ownerId: appConfig.permissions.owner_id,
    systemAdministrators: appConfig.permissions.system_administrator_ids,
    developers: appConfig.permissions.developer_ids,
    permConfig: permConfig,
  };

export const clientDebugging: Client['extendedOptions']['debug'] = {
  enabled: appConfig.debug.debug_mode_enabled,
  commandData: appConfig.debug.command_data,
};

export const clientPresence: PresenceData = {
  status: appConfig.client.presence?.status ?? 'online',
  activities:
    appConfig.client.presence?.activities.map((activity) => {
      if (!activity.url || activity.type !== 'STREAMING')
        return {
          name: activity.name,
          type:
            activity.type === 'PLAYING'
              ? ActivityType.Playing
              : activity.type === 'WATCHING'
                ? ActivityType.Watching
                : activity.type === 'LISTENING'
                  ? ActivityType.Listening
                  : activity.type === 'STREAMING'
                    ? ActivityType.Streaming
                    : activity.type === 'COMPETING'
                      ? ActivityType.Competing
                      : ActivityType.Custom,
        };
      else
        return {
          name: activity.name,
          type: ActivityType.Streaming,
          url: activity.url,
        };
    }) ?? [],
};

// If we're initializing a shard, run main
const args = process.argv.slice(2);
const initializeShard = args.some((arg) => arg.startsWith('--INITIALIZE='));
if (initializeShard) void main();
