import { appConfig } from '@/config';
import { guildSettingsFromCache } from '@/database';
import {
  EmbedBuilder,
  Guild,
  GuildMember,
  MessageCreateOptions,
  MessagePayload,
  PermissionFlagsBits,
} from 'discord.js';
import { Client } from '@rhidium/core';
import { Lang } from 'lib/i18n';

/**
 * Perform logging of a mod action to a specific server,
 * this function does not notify if missing permissions
 */
const modLog = async (
  client: Client<true>,
  guild: Guild,
  action: string,
  target: GuildMember,
  moderator: GuildMember,
  reason: string = Lang.t('general:noReasonProvided'),
) => {
  const settings = await guildSettingsFromCache(guild.id);
  if (!settings || !settings.modLogChannelId) return;

  const modLogChannel = guild.channels.cache.get(settings.modLogChannelId);
  if (!modLogChannel || !modLogChannel.isTextBased()) return;

  const hasPerms = modLogChannel
    .permissionsFor(appConfig.client.id)
    ?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]);
  if (!hasPerms) return;

  const embed = client.embeds.info({
    title: `${action} | ${target.user.tag}`,
    description: [
      `**${Lang.t('general:reason')}:** ${reason}\n**${Lang.t('general:moderator')}:**`,
      moderator.user.tag,
    ].join(' '),
  });
  embed.setThumbnail(target.user.displayAvatarURL({ forceStatic: false }));

  await modLogChannel.send({ embeds: [embed] });
};

/**
 * Perform logging of anything internal, can be considered
 * ad audit log - this function does not notify if missing permissions
 */
const adminLog = async (
  guild: Guild,
  msg: string | MessagePayload | MessageCreateOptions | EmbedBuilder,
) => {
  const settings = await guildSettingsFromCache(guild.id);
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
  static readonly modLog = modLog;
  static readonly adminLog = adminLog;
}
