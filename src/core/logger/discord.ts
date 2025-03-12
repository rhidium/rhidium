import { Client } from '../client';
import { CommandType } from '../commands';
import { TimeUtils } from '../utils';
import { BaseInteraction, PermissionFlagsBits } from 'discord.js';

const tryWithErrorLogging = async <T>(
  client: Client<true>,
  fn: () => T,
  message?: string,
  onError?: (error: Error) => void,
): Promise<{
  data: Awaited<T> | undefined;
  success: boolean;
  error: Error | undefined;
}> => {
  let data;
  let returnError: Error | undefined;
  try {
    data = await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(`${error}`);
    if (onError) onError(err);
    if (process.env.NODE_ENV === 'production')
      void DiscordLogger.logInternalError(client, error, message);
    else client.logger.error(message ?? 'An internal error has occurred', err);
    returnError = err;
  }
  return {
    data,
    success: !!data,
    error: returnError,
  };
};

const logInternalError = async (
  client: Client<true>,
  err: unknown,
  message?: string,
): Promise<boolean> => {
  const channelId = client.extendedOptions.errorChannelId;
  if (!channelId) {
    client.logger.debug(
      'No error channel id found in configuration, skipping...',
    );
    return false;
  }

  const resolvedMessage = `${message ?? 'An internal error has occurred'}:\n\`\`\`js\n${err}\n\`\`\``;
  const embed = client.embeds.error({
    title: 'Internal Error',
    description: resolvedMessage,
  });

  /** Stringified permissions as sharding doesn't serialize bigint */
  const permissions = [
    `${PermissionFlagsBits.SendMessages}`,
    `${PermissionFlagsBits.EmbedLinks}`,
  ];

  // I tried to avoid code repetition using Function#toString
  // and new Function, but it didn't work out - if anyone
  // knows how to do this, please let me know

  if (!client.cluster) {
    const channel = client.channels.cache.get(channelId);
    const logger = client.logger;
    if (!channel) {
      logger.debug('No error channel found, skipping...');
      return false;
    }

    if (!channel.isTextBased()) {
      logger.debug('Error channel is not text-based, skipping...');
      return false;
    }

    if (channel.isDMBased()) {
      logger.debug('Error channel is DM-based, skipping...');
      return false;
    }

    const resolvedPermissions = permissions.map((e) => BigInt(e));
    const hasPerms = channel
      .permissionsFor(client.user.id)
      ?.has(resolvedPermissions);

    if (!hasPerms) {
      logger.debug(
        'No permissions to send error message in specified channel, skipping...',
      );
      return false;
    }

    return await channel
      .send({ embeds: [embed] })
      .then(() => true)
      .catch((error) => {
        logger.debug(
          'Error encountered while sending error message to error channel',
          error,
        );
        return false;
      });
  }

  const results = await client.cluster.broadcastEval(
    async (c, { channelId, embed, permissions }) => {
      const channel = c.channels.cache.get(channelId);
      const logger = c.logger;
      if (!channel) {
        // No need to log, expected to not be found on other shards
        return false;
      }

      if (!channel.isTextBased()) {
        logger.debug('Error channel is not text-based, skipping...');
        return false;
      }

      if (channel.isDMBased()) {
        logger.debug('Error channel is DM-based, skipping...');
        return;
      }

      const resolvedPermissions = permissions.map((e) => BigInt(e));
      const hasPerms = channel
        .permissionsFor(c.user.id)
        ?.has(resolvedPermissions);

      if (!hasPerms) {
        logger.debug(
          'No permissions to send error message in specified channel, skipping...',
        );
        return false;
      }

      return await channel
        .send({ embeds: [embed] })
        .then(() => true)
        .catch((error) => {
          logger.debug(
            'Error encountered while sending error message to error channel',
            error,
          );
          return false;
        });
    },
    { context: { channelId, embed, permissions } },
  );

  return results.find((e) => e) ?? false;
};

const logCommandUsage = async (
  client: Client,
  command: CommandType,
  interaction: BaseInteraction,
): Promise<boolean> => {
  // Make sure we're ready before executing any commands
  if (!client.isReady()) {
    client.logger.warn(
      'Trying to log command usage before client was ready, cannot continue...',
    );
    return false;
  }

  const channelId = client.extendedOptions.commandUsageChannelId;
  if (!channelId) {
    client.logger.debug(
      'No command-usage channel id found in configuration, skipping...',
    );
    return false;
  }

  const serverOutput = interaction.guild
    ? `${interaction.guild.name} (${interaction.guild.nameAcronym})`
    : 'DM';
  const channelOutput =
    interaction.channel && interaction.inGuild()
      ? `${interaction.channel.name} (${interaction.channel.id})`
      : 'DM';
  const userOutput = `${interaction.user.tag} (${interaction.user.id})`;
  const shardOutput = client.cluster
    ? `${interaction.guild?.shardId ?? 'DM'}`
    : 'N/A';
  const embed = client.embeds.branding({
    fields: [
      {
        name: 'Command',
        value: command.data.name,
        inline: true,
      },
      {
        name: 'Server',
        value: serverOutput,
        inline: true,
      },
      {
        name: 'Channel',
        value: channelOutput,
        inline: true,
      },
      {
        name: 'User',
        value: userOutput,
        inline: true,
      },
      {
        name: 'Data',
        value: TimeUtils.discordInfoTimestamp(interaction.createdTimestamp),
        inline: true,
      },
      {
        name: 'Shard',
        value: shardOutput,
        inline: true,
      },
    ],
  });

  /** Stringified permissions as sharding doesn't serialize bigint */
  const permissions = [
    `${PermissionFlagsBits.SendMessages}`,
    `${PermissionFlagsBits.EmbedLinks}`,
  ];

  if (!client.cluster) {
    const channel = client.channels.cache.get(channelId);
    const logger = client.logger;
    if (!channel) {
      logger.debug('No command usage channel found, skipping...');
      return false;
    }

    if (!channel.isTextBased()) {
      logger.debug('Command-usage channel is not text-based, skipping...');
      return false;
    }

    if (channel.isDMBased()) {
      logger.debug('Command-usage channel is DM-based, skipping...');
      return false;
    }

    const resolvedPermissions = permissions.map((e) => BigInt(e));
    const hasPerms = channel
      .permissionsFor(client.user.id)
      ?.has(resolvedPermissions);

    if (!hasPerms) {
      logger.debug(
        'No permissions to send command-usage message in specified channel, skipping...',
      );
      return false;
    }

    return await channel
      .send({ embeds: [embed] })
      .then(() => true)
      .catch((error) => {
        logger.debug(
          'Error encountered while sending command-usage message to command usage channel',
          error,
        );
        return false;
      });
  }

  const results = await client.cluster.broadcastEval(
    async (c, { channelId, embed, permissions }) => {
      if (!c.isReady()) {
        c.logger.warn(
          'Trying to log command usage before client was ready, cannot continue...',
        );
        return false;
      }

      const channel = c.channels.cache.get(channelId);
      const logger = c.logger;
      if (!channel) {
        // No need to log, expected to not be found on other shards
        return false;
      }

      if (!channel.isTextBased()) {
        logger.debug('Command-usage channel is not text-based, skipping...');
        return false;
      }

      if (channel.isDMBased()) {
        logger.debug('Command-usage channel is DM-based, skipping...');
        return;
      }

      const resolvedPermissions = permissions.map((e) => BigInt(e));
      const hasPerms = channel
        .permissionsFor(c.user.id)
        ?.has(resolvedPermissions);

      if (!hasPerms) {
        logger.debug(
          'No permissions to send command-usage message in specified channel, skipping...',
        );
        return false;
      }

      return await channel
        .send({ embeds: [embed] })
        .then(() => true)
        .catch((error) => {
          logger.debug(
            'Error encountered while sending command-usage message to command usage channel',
            error,
          );
          return false;
        });
    },
    { context: { channelId, embed, permissions } },
  );

  return results.find((e) => e) ?? false;
};

export class DiscordLogger {
  static readonly tryWithErrorLogging = tryWithErrorLogging;
  static readonly logInternalError = logInternalError;
  static readonly logCommandUsage = logCommandUsage;
}
