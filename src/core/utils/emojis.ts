import { logger } from '@core/logger';
import { PermissionFlagsBits } from 'discord.js';

const Logger = logger();

const emojiMap: Record<string, string> = {
  '0': '0️⃣',
  '1': '1️⃣',
  '2': '2️⃣',
  '3': '3️⃣',
  '4': '4️⃣',
  '5': '5️⃣',
  '6': '6️⃣',
  '7': '7️⃣',
  '8': '8️⃣',
  '9': '9️⃣',
  a: '🇦',
  b: '🇧',
  c: '🇨',
  d: '🇩',
  e: '🇪',
  f: '🇫',
  g: '🇬',
  h: '🇭',
  i: '🇮',
  j: '🇯',
  k: '🇰',
  l: '🇱',
  m: '🇲',
  n: '🇳',
  o: '🇴',
  p: '🇵',
  q: '🇶',
  r: '🇷',
  s: '🇸',
  t: '🇹',
  u: '🇺',
  v: '🇻',
  w: '🇼',
  x: '🇽',
  y: '🇾',
  z: '🇿',
  '!': '❗',
  '?': '❓',
  '#': '#️⃣',
  '*': '*️⃣',
  '+': '➕',
  '-': '➖',
  '/': '➗',
  '=': '🟰',
  '@': '📧',
  $: '💲',
  '%': '🔢',
  '&': '🔗',
  '(': '🈴',
  ')': '🈵',
  '^': '⬆️',
  _: '➖',
  '[': '🆖',
  ']': '🆗',
  '{': '🈶',
  '}': '🈚',
  '<': '◀️',
  '>': '▶️',
  '|': '🚧',
  '\\': '⛔',
  '~': '〰️',
};

const emojify = (str: string) => {
  return str
    .split('')
    .map((char) => emojiMap[char] ?? char)
    .join('');
};

class EmojiUtils {
  static readonly emojify = emojify;
  static readonly emojiMap = emojiMap;
  static readonly permissionEmojis = {
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
}

for (const permission of Object.values(PermissionFlagsBits)) {
  if (!EmojiUtils.permissionEmojis[permission.toString()]) {
    Logger.warn(`! Permission emoji not found for ${permission}`);
  }
}

export { EmojiUtils };
