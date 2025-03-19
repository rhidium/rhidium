import { ChannelType } from 'discord.js';
import { GuildSettingsPrompts } from './types';
import { PromptUtils } from '@core';

// [DEV] `updater` should be optional, we have enough type information to implement a default updater

export const guildSettingsPrompts: GuildSettingsPrompts = [
  {
    id: 'admin-role-id',
    type: 'role',
    name: 'Administrator Role',
    description: 'The role required to use administrator commands.',
    required: false,
    multiple: false,
    accessor: 'adminRoleId',
    updater: async (guild, value) => {
      return guild.adminRoleId;
    },
  },
  {
    id: 'audit-log-channel-id',
    type: 'channel',
    name: 'Audit Log Channel',
    description: 'The channel where administrative actions are logged.',
    required: false,
    multiple: false,
    channelTypes: [ChannelType.GuildText],
    accessor: 'adminLogChannelId',
    updater: async (guild, value) => {
      return guild.adminLogChannelId;
    },
  },
  {
    id: 'mod-role-id',
    type: 'role',
    name: 'Moderator Role',
    description: 'The role required to use moderator commands.',
    required: false,
    multiple: false,
    accessor: 'modRoleId',
    updater: async (guild, value) => {
      return guild.modRoleId;
    },
  },
  {
    id: 'mod-log-channel-id',
    type: 'channel',
    name: 'Moderation Log Channel',
    description: 'The channel where moderation actions are logged.',
    required: false,
    multiple: false,
    channelTypes: [ChannelType.GuildVoice],
    accessor: 'modLogChannelId',
    updater: async (guild, value) => {
      return guild.modLogChannelId;
    },
  },
  {
    id: 'auto-role-ids',
    type: 'role',
    name: 'Auto Roles',
    description: 'Roles that are automatically assigned to new members.',
    required: true,
    multiple: true,
    minValues: 0,
    maxValues: 25,
    accessor: 'autoRoleIds',
    updater: async (guild, value) => {
      return guild.autoRoleIds;
    },
  },
  {
    id: 'member-join-channel-id',
    type: 'channel',
    name: 'Member Join Channel',
    description: 'The channel where member join messages are sent.',
    required: false,
    multiple: false,
    channelTypes: [ChannelType.GuildText],
    accessor: 'memberJoinChannelId',
    updater: async (guild, value) => {
      return guild.memberJoinChannelId;
    },
  },
  {
    id: 'member-leave-channel-id',
    type: 'channel',
    name: 'Member Leave Channel',
    description: 'The channel where member leave messages are sent.',
    required: false,
    multiple: false,
    channelTypes: [ChannelType.GuildText],
    accessor: 'memberLeaveChannelId',
    updater: async (guild, value) => {
      return guild.memberLeaveChannelId;
    },
  },
  {
    type: 'string',
    id: 'test',
    name: 'Test',
    description: 'Test',
    required: false,
    multiple: false,
    accessor: 'adminLogChannelId',
    updater: async (guild, value) => {
      return guild.adminLogChannelId;
    },
  },
];

PromptUtils.promptInteraction;
