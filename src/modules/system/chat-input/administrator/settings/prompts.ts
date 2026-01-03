import { ChannelType } from 'discord.js';
import { type SettingsPrompts } from './types';
import { PromptDisplay } from '@core/utils';

// Please note, the defaultValue in `settingsPrompts` is set when a guild resets it's respective setting.

export const settingsPrompts: SettingsPrompts = [
  //
  // START Permissions
  //

  {
    id: 'admin-roles',
    type: 'role',
    name: 'Administrator Roles',
    message: 'Roles that have full access to all administrative commands.',
    required: true,
    multiple: true,
    minValues: 1,
    maxValues: 5,
    defaultValue: [],
    accessor: 'adminRoleIds',
    display: {
      category: 'Permissions',
    },
  },
  {
    id: 'admin-users',
    type: 'user',
    name: 'Administrator Users',
    message:
      'Individual users that have full access to all administrative commands.',
    required: false,
    multiple: true,
    minValues: 0,
    maxValues: 25,
    defaultValue: [],
    accessor: 'adminUserIds',
    display: {
      category: 'Permissions',
      infoSuffix:
        'This setting is useful for users that need to have admin permissions but do not have a role that grants them.',
    },
  },
  {
    id: 'mod-role-id',
    type: 'role',
    name: 'Moderator Roles',
    message: 'Roles that have access to all moderation commands.',
    required: true,
    multiple: true,
    minValues: 1,
    maxValues: 5,
    defaultValue: [],
    accessor: 'modRoleIds',
    display: {
      category: 'Permissions',
    },
  },
  {
    id: 'mods-can-moderate-mods',
    type: 'boolean',
    name: 'Moderators Can Moderate Each Other',
    message:
      'Allow mods to moderate other moderators. This includes the ability to warn, kick, and ban.',
    required: false,
    multiple: false,
    defaultValue: false,
    accessor: 'modsCanModerateMods',
    display: {
      category: 'Permissions',
      infoSuffix:
        'This setting is disabled by default. When true, mods can moderate other moderators **only** if they have a higher role position. Recommended when using multiple **`Moderator Roles`**.',
    },
  },
  {
    id: 'disabled-commands',
    type: 'string',
    name: 'Disabled Commands',
    message: "Commands that you don't want to be available in this server.",
    required: false,
    multiple: true,
    defaultValue: [],
    accessor: 'disabledCommands',
    display: {
      category: 'Permissions',
      infoSuffix:
        'Please use "/commands" for a complete list of available commands and what they do. If a command is not displayed here, you are likely missing permissions to use it.',
    },
  },

  //
  // START Logging
  //

  {
    id: 'audit-log-channel-id',
    type: 'channel',
    name: 'Audit Log Channel',
    message: 'The channel where administrative actions are logged.',
    required: false,
    multiple: false,
    channelTypes: [ChannelType.GuildText],
    defaultValue: null,
    accessor: 'auditLogChannelId',
    display: {
      category: 'Logging',
    },
  },
  {
    id: 'mod-log-channel-id',
    type: 'channel',
    name: 'Moderation Log Channel',
    message: 'The channel where moderation actions are logged.',
    required: false,
    multiple: false,
    channelTypes: [ChannelType.GuildText],
    defaultValue: null,
    accessor: 'modLogChannelId',
    display: {
      category: 'Logging',
      infoSuffix:
        'This channel is used to log moderation actions such as warnings, kicks, and bans. If not set, the audit log channel will be used as a fallback.',
    },
  },

  //
  // START Member Management
  //

  {
    id: 'auto-role-ids',
    type: 'role',
    name: 'Auto Roles',
    message:
      'Please select between 0 and 25 roles that should be automatically assigned to new members.',
    required: false,
    multiple: true,
    minValues: 0,
    maxValues: 25,
    defaultValue: [],
    accessor: 'autoRoleIds',
    display: {
      category: 'Member Management',
    },
  },
  {
    id: 'member-join-channel-id',
    type: 'channel',
    name: 'Member Join Channel',
    message: 'The channel to send notifications to when a new member joins.',
    required: false,
    multiple: false,
    defaultValue: null,
    channelTypes: [ChannelType.GuildText],
    accessor: 'memberJoinChannelId',
    display: {
      category: 'Member Management',
    },
  },
  {
    id: 'member-leave-channel-id',
    type: 'channel',
    name: 'Member Leave Channel',
    message: 'The channel to send notifications to when a member leaves.',
    required: false,
    multiple: false,
    defaultValue: null,
    channelTypes: [ChannelType.GuildText],
    accessor: 'memberLeaveChannelId',
    display: {
      category: 'Member Management',
    },
  },
] as const;

export const settingsAllRequired = settingsPrompts.every((e) => e.required);
export const settingsAllOptional = settingsPrompts.every((e) => !e.required);
export const hasShortSetup = !settingsAllRequired && !settingsAllOptional;

export const settingsChoices = settingsPrompts.map((prompt, ind) => ({
  name: prompt.name,
  value: `${ind}`,
}));

export const resettableSettingsChoices = settingsPrompts
  .filter((prompt) => typeof prompt.defaultValue !== 'undefined')
  .map((prompt) => ({
    name: prompt.name,
    value: prompt.accessor,
  }));

export const groupedSettingsPrompts = PromptDisplay.groupByCategory(
  [...settingsPrompts].sort(PromptDisplay.sortByCategory),
);

export const groupedSettingsChoices = Object.entries(
  groupedSettingsPrompts,
).map(([category], ind) => ({
  name: category,
  value: `${ind}`,
}));
