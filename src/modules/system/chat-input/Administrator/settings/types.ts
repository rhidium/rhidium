import {
  AnyPromptValue,
  MappedPrompt,
  PermissionUtils,
  PopulatedGuild,
  Prompt,
  PromptType,
  PromptValidation,
} from '@core';
import { Guild, PermissionFlagsBits } from 'discord.js';

const permissionSettings: (keyof Pick<
  PopulatedGuild,
  'adminRoleIds' | 'adminUserIds' | 'modRoleIds'
>)[] = ['adminRoleIds', 'adminUserIds', 'modRoleIds'] as const;

type PermissionSetting = (typeof permissionSettings)[number];

const sendableChannelSettings: (keyof Pick<
  PopulatedGuild,
  | 'modLogChannelId'
  | 'auditLogChannelId'
  | 'memberJoinChannelId'
  | 'memberLeaveChannelId'
>)[] = [
  'modLogChannelId',
  'auditLogChannelId',
  'memberJoinChannelId',
  'memberLeaveChannelId',
] as const;

export const sendableChannelFormatter = (
  guild: Guild,
  prompt: Prompt,
  value: AnyPromptValue,
  emojis: {
    success: string;
    error: string;
  },
) => {
  if (value === null || typeof value === 'undefined') {
    return PromptValidation.isPromptWithMultiple(prompt)
      ? 'None'
      : 'Not configured';
  }

  const channelId = value.toString();
  const channel = guild.channels.cache.get(channelId);

  if (!channel) {
    return emojis.error + ' Unknown channel';
  }

  if (!channel.isTextBased()) {
    return `${emojis.error} <#${channelId}> (Not a text channel, cannot send messages)`;
  }

  const permissions = PermissionUtils.hasChannelPermissions(
    guild.client.user.id,
    channel,
    [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  );

  if (permissions !== true) {
    return `${emojis.error} <#${channelId}> (Missing permissions: ${PermissionUtils.displayPermissions(permissions, ', ')})`;
  }

  return `${emojis.success} <#${channelId}> (Active, permissions OK)`;
};

type SendableChannelSetting = (typeof sendableChannelSettings)[number];

type SettingsKey = Exclude<
  keyof PopulatedGuild,
  | 'SeverityConfiguration'
  | 'AutoModerationActions'
  | 'MemberJoinEmbed'
  | 'MemberLeaveEmbed'
>;

type SettingsPrompt<
  K extends SettingsKey,
  T extends PromptType,
  R extends boolean,
  M extends boolean,
> = MappedPrompt<T, R, M> & {
  accessor: K;
  displayInline?: boolean;
  displayCategory?: string;
  infoSuffix?: string;
};

type SettingsPromptMap<K extends SettingsKey> = {
  [T in PromptType]:
    | SettingsPrompt<K, T, true, true>
    | SettingsPrompt<K, T, true, false>
    | SettingsPrompt<K, T, false, true>
    | SettingsPrompt<K, T, false, false>;
};

type SettingsPrompts = {
  [K in SettingsKey]: SettingsPromptMap<K>[PromptType];
}[SettingsKey][];

export {
  permissionSettings,
  type PermissionSetting,
  sendableChannelSettings,
  type SendableChannelSetting,
  type SettingsKey,
  type SettingsPrompt,
  type SettingsPromptMap,
  type SettingsPrompts,
};
