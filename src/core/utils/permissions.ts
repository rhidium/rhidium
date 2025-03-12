import { Client } from '../client';
import { PermLevel } from '../managers';
import {
  APIInteractionGuildMember,
  Guild,
  GuildChannel,
  GuildMember,
  PermissionFlagsBits,
  PermissionsBitField,
  Snowflake,
} from 'discord.js';
import { StringUtils } from './common/strings';
import { CommandType } from '../commands';
import { logger } from '../logger';

const validPermValues = Object.values(PermissionsBitField.Flags);

const permissionEmojis: Record<string, string> = {
  [PermissionFlagsBits.AddReactions.toString()]: '👍',
  [PermissionFlagsBits.Administrator.toString()]: '👑',
  [PermissionFlagsBits.AttachFiles.toString()]: '📎',
  [PermissionFlagsBits.BanMembers.toString()]: '🔨',
  [PermissionFlagsBits.ChangeNickname.toString()]: '✏️',
  [PermissionFlagsBits.Connect.toString()]: '🔌',
  [PermissionFlagsBits.CreateInstantInvite.toString()]: '💌',
  [PermissionFlagsBits.CreatePrivateThreads.toString()]: '🔒',
  [PermissionFlagsBits.CreatePublicThreads.toString()]: '📢',
  [PermissionFlagsBits.DeafenMembers.toString()]: '🔇',
  [PermissionFlagsBits.EmbedLinks.toString()]: '🔗',
  [PermissionFlagsBits.KickMembers.toString()]: '👢',
  [PermissionFlagsBits.ManageChannels.toString()]: '🔧',
  [PermissionFlagsBits.ManageEvents.toString()]: '📅',
  [PermissionFlagsBits.ManageGuild.toString()]: '📚',
  [PermissionFlagsBits.ManageGuildExpressions.toString()]: '🗂️',
  [PermissionFlagsBits.ManageMessages.toString()]: '📧',
  [PermissionFlagsBits.ManageNicknames.toString()]: '📝',
  [PermissionFlagsBits.ManageRoles.toString()]: '🛡️',
  [PermissionFlagsBits.ManageThreads.toString()]: '🧵',
  [PermissionFlagsBits.ManageWebhooks.toString()]: '🎣',
  [PermissionFlagsBits.MentionEveryone.toString()]: '📣',
  [PermissionFlagsBits.ModerateMembers.toString()]: '👮',
  [PermissionFlagsBits.MoveMembers.toString()]: '🚶',
  [PermissionFlagsBits.MuteMembers.toString()]: '🔇',
  [PermissionFlagsBits.PrioritySpeaker.toString()]: '🔊',
  [PermissionFlagsBits.ReadMessageHistory.toString()]: '📜',
  [PermissionFlagsBits.RequestToSpeak.toString()]: '🎤',
  [PermissionFlagsBits.SendMessages.toString()]: '✉️',
  [PermissionFlagsBits.SendMessagesInThreads.toString()]: '🧵',
  [PermissionFlagsBits.SendTTSMessages.toString()]: '🗣️',
  [PermissionFlagsBits.SendVoiceMessages.toString()]: '🎙️',
  [PermissionFlagsBits.Speak.toString()]: '🎙️',
  [PermissionFlagsBits.Stream.toString()]: '🎥',
  [PermissionFlagsBits.UseApplicationCommands.toString()]: '📲',
  [PermissionFlagsBits.UseEmbeddedActivities.toString()]: '📹',
  [PermissionFlagsBits.UseExternalEmojis.toString()]: '🤖',
  [PermissionFlagsBits.UseExternalSounds.toString()]: '🔊',
  [PermissionFlagsBits.UseExternalStickers.toString()]: '🪧',
  [PermissionFlagsBits.UseSoundboard.toString()]: '🔊',
  [PermissionFlagsBits.UseVAD.toString()]: '🗣️',
  [PermissionFlagsBits.ViewAuditLog.toString()]: '📜',
  [PermissionFlagsBits.ViewChannel.toString()]: '📺',
  [PermissionFlagsBits.ViewCreatorMonetizationAnalytics.toString()]: '💰',
  [PermissionFlagsBits.ViewGuildInsights.toString()]: '📈',
};

for (const permission of Object.values(PermissionFlagsBits)) {
  if (!permissionEmojis[permission.toString()]) {
    logger._warn(
      `Permission emoji not found for ${permission}, using default emoji`,
    );
    permissionEmojis[permission.toString()] = '❓';
  }
}

const displayPermissions = (perms: bigint[], joinStr = ', ') => {
  const permOutput = new PermissionsBitField(perms)
    .toArray()
    .filter((_e, ind) => typeof perms[ind] !== 'undefined')
    .map(
      (e, ind) =>
        `${permissionEmojis[perms[ind].toString()]} ${StringUtils.splitOnUppercase(e)}`,
    )
    .join(joinStr);
  return permOutput;
};

const filterInvalidPermissions = (perms: bigint[]) =>
  perms.filter((perm) => !validPermValues.includes(perm));

const hasChannelPermissions = (
  userId: Snowflake,
  channel: GuildChannel,
  perms: bigint[],
) => {
  let resolvedPermArr = perms;
  if (typeof perms === 'string') resolvedPermArr = [perms];

  const invalidPerms = filterInvalidPermissions(resolvedPermArr);
  if (invalidPerms.length >= 1) {
    throw new Error(
      `Invalid Discord permissions were provided: ${invalidPerms.join(', ')}`,
    );
  }

  if (!channel.permissionsFor(userId)) return resolvedPermArr;

  const missingPerms = resolvedPermArr.filter((perm) => {
    const isValidPerm = validPermValues.find((e) => e === perm);
    if (!isValidPerm) return true;
    return !channel.permissionsFor(userId)?.has(isValidPerm);
  });

  return missingPerms.length >= 1 ? missingPerms : true;
};

const resolveMemberPermissionLevel = async (
  client: Client,
  member: GuildMember | APIInteractionGuildMember | null,
  guild: Guild | null,
) => {
  // Note: Member and guild can be null for DMs
  if (member === null || guild === null) return PermLevel.User;

  // Note: During outages, guilds can be unavailable
  if (!guild.available) return PermLevel.User;

  const resolvedMember = !(member instanceof GuildMember)
    ? ((await guild.members.fetch(member.user.id).catch(() => null)) ?? null)
    : member;

  if (resolvedMember === null) return PermLevel.User;

  for await (const permCfg of client.internalPermissions.permConfig) {
    const hasLevel = await permCfg.hasLevel(
      client.internalPermissions,
      resolvedMember,
    );
    if (hasLevel === true) return PermLevel[permCfg.name];
  }

  return PermLevel.User;
};

const permissionsForCommands = (
  commands: CommandType[],
  accessor: 'clientPerms' | 'userPerms' = 'clientPerms',
) => [
  ...new Set(
    commands.reduce((acc, cmd) => {
      const permissions = cmd[accessor];
      return [...acc, ...permissions];
    }, []),
  ),
];

class PermissionUtils {
  /**
   * Array of valid Discord permission values
   */
  static readonly validPermValues = validPermValues;
  /**
   * Discord permissions mapped to emojis
   */
  static readonly permissionEmojis = permissionEmojis;
  /**
   * Display an array of (bigint) permissions in a human-readable format
   * @param perms The array of permissions to display
   * @param joinStr The string to join the permissions with
   * @returns The formatted string
   */
  static readonly displayPermissions = displayPermissions;
  /**
   * Filter out invalid permissions from an array
   * @param perms The array of permissions to filter
   * @returns The filtered array
   */
  static readonly filterInvalidPermissions = filterInvalidPermissions;
  /**
   * Check if a user has specific permissions in a channel
   * @param userId The user ID to check
   * @param channel The channel to check
   * @param perms The permissions to check
   * @returns True if the member has all permissions, or the array of missing permissions
   */
  static readonly hasChannelPermissions = hasChannelPermissions;
  /**
   * Resolve the permission level of a member
   * @param client The client to use for the lookup
   * @param member The member to resolve the permission level for
   * @returns The resolved permission level
   */
  static readonly resolveMemberPermissionLevel = resolveMemberPermissionLevel;
  /**
   * Resolve all permissions required for a set of commands
   * @param commands The commands to get the permissions for
   * @param accessor The accessor to use (client or user permissions)
   * @returns The array of permissions required for the commands
   */
  static readonly permissionsForCommands = permissionsForCommands;
}

export { PermissionUtils };
