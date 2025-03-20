import { GuildMember, PermissionFlagsBits, Snowflake } from 'discord.js';
import { Database } from '../database';

export const permConfig: ClientPermissionLevel[] = [
  {
    name: 'User',
    level: 0,
    hasLevel: () => true,
  },

  {
    name: 'Moderator',
    level: 1,
    hasLevel: async (_config, member) => {
      const guildSettings = await Database.Guild.resolve(member.guild.id);
      if (!guildSettings) return false;
      if (!guildSettings.modRoleIds.length) {
        return (
          member.permissions.has(PermissionFlagsBits.KickMembers) &&
          member.permissions.has(PermissionFlagsBits.BanMembers) &&
          member.permissions.has(PermissionFlagsBits.ManageMessages)
        );
      }
      return member.roles.cache.some((role) =>
        guildSettings.modRoleIds.includes(role.id),
      );
    },
  },

  {
    name: 'Administrator',
    level: 2,
    hasLevel: async (_config, member) => {
      const guildSettings = await Database.Guild.resolve(member.guild.id);
      if (!guildSettings) return false;
      if (!guildSettings.adminRoleIds) {
        return member.permissions.has(PermissionFlagsBits.Administrator);
      }
      return member.roles.cache.some((role) =>
        guildSettings.adminRoleIds.includes(role.id),
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

export enum PermLevel {
  User = 0,
  Moderator = 1,
  Administrator = 2,
  'Server Owner' = 3,
  'Bot Administrator' = 4,
  Developer = 5,
  'Bot Owner' = 6,
}

export const permLevelValues = Object.values(PermLevel);
export const resolvePermLevel = (permLevel: number) =>
  permLevelValues[permLevel];

export interface ClientPermissionLevel {
  name: keyof typeof PermLevel;
  level: number;
  hasLevel(
    config: ClientPermissions,
    member: GuildMember,
  ): boolean | Promise<boolean>;
}
export interface ClientPermissionOptions {
  /**
   * The Discord user id of the bot owner,
   * will be assigned the highest permission level
   */
  ownerId?: Snowflake;
  /**
   * An array of Discord user ids,
   * will be assigned the second-highest permission level
   */
  developers?: Snowflake[];
  /**
   * Array of user ids that can execute administrative
   * actions like restart and reload
   */
  systemAdministrators?: Snowflake[];
  /**
   * Represents an object to configure internal
   * bot permission levels
   */
  permConfig?: ClientPermissionLevel[];
}

export class ClientPermissions {
  ownerId: Snowflake | null;
  developers: Snowflake[];
  systemAdministrators: Snowflake[];
  permConfig: ClientPermissionLevel[];
  permConfigSorted: ClientPermissionLevel[];
  constructor({
    ownerId,
    developers,
    systemAdministrators,
    permConfig,
  }: ClientPermissionOptions) {
    this.ownerId = ownerId ?? null;
    this.developers = developers ?? [];
    this.systemAdministrators = systemAdministrators ?? [];
    const permConfigSorted =
      permConfig?.sort((a, b) => b.level - a.level) ?? [];
    this.permConfig = permConfig ?? permConfigSorted;
    this.permConfigSorted = permConfigSorted;
  }
}
