import { Permissions } from '@core/commands/permissions';
import type { PopulatedGuild } from '@core/database/select';
import { logger } from '@core/logger';
import {
  Guild,
  type GuildBasedChannel,
  type MessageCreateOptions,
  MessagePayload,
  PermissionFlagsBits,
  type TextBasedChannel,
} from 'discord.js';

const Logger = logger();

type ModLogMessage = string | MessagePayload | MessageCreateOptions;
type ModLogOptions = {
  guild: PopulatedGuild;
  discordGuild: Guild;
  message: ModLogMessage;
};

class ModLogServices {
  static readonly requiredPermissions = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
  ];

  static readonly channel = (
    options: Omit<ModLogOptions, 'message'>,
  ): (GuildBasedChannel & TextBasedChannel) | null => {
    const { guild, discordGuild } = options;

    if (!guild.modLogChannelId) return null;

    const channel = discordGuild.channels.cache.get(guild.modLogChannelId);

    if (!channel || !channel.isTextBased()) return null;

    return channel;
  };

  static readonly checkPermissions = (
    channel: GuildBasedChannel & TextBasedChannel,
  ): true | bigint[] => {
    if (channel.isThread() || !channel.guild.members.me) {
      return this.requiredPermissions;
    }

    return Permissions.hasChannelPermissions(
      channel.guild.members.me.id,
      channel,
      this.requiredPermissions,
    );
  };

  static readonly send = async (options: ModLogOptions): Promise<boolean> => {
    const { message } = options;
    const channel = options.guild.modLogChannelId
      ? this.channel(options)
      : null;

    if (
      !channel ||
      this.checkPermissions(channel) !== true ||
      !options.guild.modLogChannelId
    ) {
      return false;
    }

    try {
      await channel.send(message);
    } catch (error) {
      Logger.error(`Failed to send public mod log message: ${error}`);
      return false;
    }

    return true;
  };
}

export { ModLogServices, type ModLogMessage, type ModLogOptions };
