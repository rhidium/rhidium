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
import { StringUtils } from './strings';
import { CommandType } from '../commands';

const validPermValues = Object.values(PermissionsBitField.Flags);

const permissionEmojis = {
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

const bigIntPermOutput = (permArr: bigint[], joinStr = ', ') => {
  const permOutput = new PermissionsBitField(permArr)
    .toArray()
    .filter((_e, ind) => typeof permArr[ind] !== 'undefined')
    .map(
      (e, ind) =>
        `${permissionEmojis[permArr[ind]?.toString() as string]} ${StringUtils.splitOnUppercase(e)}`,
    )
    .join(joinStr);
  return permOutput;
};

const getInvalidPerms = (permArr: bigint[]) =>
  permArr.filter((perm) => !validPermValues.includes(perm));

/**
 * Check if a user has specific permissions in a channel
 * @returns True if the member has all permissions,
 * or the array of missing permissions
 */
const hasChannelPerms = (
  userId: Snowflake,
  channel: GuildChannel,
  permArr: bigint[],
) => {
  let resolvedPermArr = permArr;
  if (typeof permArr === 'string') resolvedPermArr = [permArr];

  const invalidPerms = getInvalidPerms(resolvedPermArr);
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

const resolveMemberPermLevel = async (
  client: Client,
  member: GuildMember | APIInteractionGuildMember | null,
  guild: Guild | null,
) => {
  if (!member || !guild) return PermLevel.User;

  const resolvedMember = !(member instanceof GuildMember)
    ? ((await guild?.members.fetch(member.user.id).catch(() => null)) ?? null)
    : member;

  if (resolvedMember === null || typeof resolvedMember === 'undefined')
    return PermLevel.User;

  for await (const permCfg of client.internalPermissions.permConfig) {
    if (!guild || !guild.available) continue;
    const hasLevel = await permCfg.hasLevel(
      client.internalPermissions,
      resolvedMember,
    );
    if (hasLevel === true) return PermLevel[permCfg.name];
  }

  return PermLevel.User;
};

const uniqueCommandPermissions = (commands: CommandType[]) => [
  ...new Set(
    commands.reduce((acc, cmd) => {
      const permissions = cmd.clientPerms;
      return [...acc, ...permissions];
    }, []),
  ),
];

export class PermissionUtils {
  static readonly validPermValues = validPermValues;
  static readonly permissionEmojis = permissionEmojis;
  static readonly bigIntPermOutput = bigIntPermOutput;
  static readonly getInvalidPerms = getInvalidPerms;
  static readonly hasChannelPerms = hasChannelPerms;
  static readonly resolveMemberPermLevel = resolveMemberPermLevel;
  static readonly uniqueCommandPermissions = uniqueCommandPermissions;
}
