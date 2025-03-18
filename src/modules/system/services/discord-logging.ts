import {
  EmbedBuilder,
  Guild,
  MessageCreateOptions,
  MessagePayload,
  PermissionFlagsBits,
} from 'discord.js';
import { appConfig, Database } from '@core';

/**
 * Perform logging of anything internal, can be considered
 * ad audit log - this function does not notify if missing permissions
 */
const adminLog = async (
  guild: Guild,
  msg: string | MessagePayload | MessageCreateOptions | EmbedBuilder,
) => {
  const settings = await Database.Guild.resolve(guild.id);
  if (!settings || !settings.adminLogChannelId) return;

  const adminLogChannel = guild.channels.cache.get(settings.adminLogChannelId);
  if (!adminLogChannel || !adminLogChannel.isTextBased()) return;

  const hasPerms = adminLogChannel
    .permissionsFor(appConfig.client.id)
    ?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]);
  if (!hasPerms) return;

  const resolvedMsg = msg instanceof EmbedBuilder ? { embeds: [msg] } : msg;
  await adminLogChannel.send(resolvedMsg);
};

export class LoggingServices {
  static readonly adminLog = adminLog;
}
