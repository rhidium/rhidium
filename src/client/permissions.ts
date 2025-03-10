import { ClientPermissionLevel } from '@rhidium/core';
import { guildSettingsFromCache } from './database';
import { PermissionFlagsBits } from 'discord.js';

export const permConfig: ClientPermissionLevel[] = [
  {
    name: 'User',
    level: 0,
    hasLevel: () => true,
  },

  {
    name: 'Moderator',
    level: 1,
    /**
     * Note: This doesn't check if the member has Kick/Ban member perms
     * as that would mean people could have access to sensitive commands
     * without the owner/admin explicitly setting the required role first
     */
    hasLevel: async (_config, member) => {
      const guildSettings = await guildSettingsFromCache(member.guild.id);
      if (!guildSettings) return false;
      return member.roles.cache.some(
        (role) => guildSettings.modRoleId === role.id,
      );
    },
  },

  {
    name: 'Administrator',
    level: 2,
    hasLevel: async (_config, member) => {
      const guildSettings = await guildSettingsFromCache(member.guild.id);
      if (!guildSettings) return false;
      if (!guildSettings.adminRoleId)
        return member.permissions.has(PermissionFlagsBits.Administrator);
      return member.roles.cache.some(
        (role) => guildSettings.adminRoleId === role.id,
      );
    },
  },

  {
    name: 'Server Owner',
    level: 3,
    hasLevel: (_config, member) => {
      if (member.guild?.ownerId) {
        return member.guild.ownerId === member.id;
      }
      return false;
    },
  },

  {
    name: 'Bot Administrator',
    level: 4,
    hasLevel(config, member) {
      return config.systemAdministrators.includes(member.id);
    },
  },

  {
    name: 'Developer',
    level: 5,
    hasLevel: (config, member) => config.developers.includes(member.id),
  },

  {
    name: 'Bot Owner',
    level: 6,
    hasLevel: (config, member) => config.ownerId === member.id,
  },
];
