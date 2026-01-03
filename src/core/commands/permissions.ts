import { appConfig } from '@core/config/app';
import { UnitConstants } from '@core/constants/units';
import { CacheManager } from '@core/data-structures/cache/manager';
import type { Database } from '@core/database/wrappers';
import { StringUtils } from '@core/utils/common/strings';
import { EmojiUtils } from '@core/utils/emojis';
import {
  type APIInteractionGuildMember,
  Guild,
  GuildChannel,
  GuildMember,
  type GuildTextBasedChannel,
  PermissionFlagsBits,
  type PermissionResolvable,
  PermissionsBitField,
  type Snowflake,
} from 'discord.js';

enum PermLevel {
  User = 0,
  Moderator = 1,
  Administrator = 2,
  'Server Owner' = 3,
  Developer = 4,
  'Bot Administrator' = 5,
  'Bot Owner' = 6,
}

type PermissionLevelName = keyof typeof PermLevel;

interface PermissionLevelConfiguration {
  name: PermissionLevelName;
  level: PermLevel;
  hasLevel(
    config: ClientPermissionOptions,
    member: GuildMember,
    db: typeof Database
  ): boolean | Promise<boolean>;
}

interface ClientPermissionOptions {
  ownerId: Snowflake;
  developers: Snowflake[];
  systemAdministrators: Snowflake[];
  levels: PermissionLevelConfiguration[];
}

const config: ClientPermissionOptions = {
  ownerId: appConfig.permissions.owner_id,
  developers: appConfig.permissions.developer_ids,
  systemAdministrators: appConfig.permissions.system_administrator_ids,
  levels: [
    {
      name: 'User',
      level: PermLevel.User,
      hasLevel: () => Promise.resolve(true),
    },
    {
      name: 'Moderator',
      level: PermLevel.Moderator,
      hasLevel: async (_config, member, Database) => {
        const guild = await Database.Guild.resolve(member.guild.id);

        if (!guild.modRoleIds.length) {
          return (
            member.permissions.has(PermissionFlagsBits.KickMembers) &&
            member.permissions.has(PermissionFlagsBits.BanMembers) &&
            member.permissions.has(PermissionFlagsBits.ManageMessages)
          );
        }

        return member.roles.cache.some((role) =>
          guild.modRoleIds.includes(role.id),
        );
      },
    },
    {
      name: 'Administrator',
      level: PermLevel.Administrator,
      hasLevel: async (_config, member, db) => {
        const guild = await db.Guild.resolve(member.guild.id);

        if (!guild.adminRoleIds.length && !guild.adminUserIds.length) {
          return member.permissions.has(PermissionFlagsBits.Administrator);
        }

        return (
          guild.adminUserIds.includes(member.id) ||
          member.roles.cache.some((role) =>
            guild.adminRoleIds.includes(role.id),
          )
        );
      },
    },
    {
      name: 'Server Owner',
      level: PermLevel['Server Owner'],
      hasLevel: (_config, member) =>
        Promise.resolve(member.guild.ownerId === member.id),
    },
    {
      name: 'Developer',
      level: PermLevel.Developer,
      hasLevel: (config, member) =>
        Promise.resolve(config.developers.includes(member.id)),
    },
    {
      name: 'Bot Administrator',
      level: PermLevel['Bot Administrator'],
      hasLevel: (config, member) =>
        Promise.resolve(config.systemAdministrators.includes(member.id)),
    },
    {
      name: 'Bot Owner',
      level: PermLevel['Bot Owner'],
      hasLevel: (config, member) =>
        Promise.resolve(config.ownerId === member.id),
    },
  ],
};

class Permissions {
  public static readonly config = config;
  public static readonly FLAGS = PermissionFlagsBits;
  public static readonly sortedLevels = Permissions.config.levels.sort(
    (a, b) => b.level - a.level,
  );

  private static readonly cache = CacheManager.fromStore<PermLevel>({
    ttl: UnitConstants.MS_IN_ONE_HOUR,
    max: 1000,
  });
  public static readonly clearCacheForGuild = async (guildId: string) => {
    await Permissions.cache.clearByPrefix(`${guildId}:`);
  };

  public static readonly validPermissions = Object.values(
    PermissionsBitField.Flags,
  );
  public static readonly filterInvalidPermissions = (perms: bigint[]) =>
    perms.filter((perm) => !Permissions.validPermissions.includes(perm));

  public static readonly intToString = (
    level: PermLevel,
  ): PermissionLevelName => {
    const foundLevel = Permissions.sortedLevels.find((e) => e.level === level);

    if (!foundLevel) {
      throw new Error(
        `Invalid permission level provided: ${level}. Valid levels are: ${Permissions.sortedLevels
          .map((e) => e.level)
          .join(', ')}`,
      );
    }

    return foundLevel.name;
  };

  public static readonly resolveForMember = async (
    member: GuildMember | APIInteractionGuildMember | null,
    guild: Guild | null,
    db: typeof Database,
  ): Promise<PermLevel> => {
    if (member === null || guild === null) {
      return PermLevel.User;
    }

    const cacheKey = `${guild.id}-${member.user.id}`;
    const cacheData = await Permissions.cache.get(cacheKey);

    if (cacheData) {
      return cacheData;
    }

    const resolvedMember = !(member instanceof GuildMember)
      ? ((await guild.members.fetch(member.user.id).catch(() => null)) ?? null)
      : member;

    if (resolvedMember === null) {
      return PermLevel.User;
    }

    let resolvedLevel = PermLevel.User;
    for await (const { level, hasLevel } of Permissions.sortedLevels) {
      if (await hasLevel(Permissions.config, resolvedMember, db)) {
        resolvedLevel = level;
        break;
      }
    }

    await Permissions.cache.set(cacheKey, resolvedLevel);

    return resolvedLevel;
  };

  public static readonly hasChannelPermissions = (
    userId: Snowflake,
    channel: GuildChannel | GuildTextBasedChannel,
    perms: bigint | bigint[],
  ) => {
    const resolvedPermArr = Array.isArray(perms) ? perms : [perms];
    const invalidPerms = Permissions.filterInvalidPermissions(resolvedPermArr);

    if (invalidPerms.length >= 1) {
      throw new Error(
        `Invalid Discord permissions were provided: ${invalidPerms.join(', ')}`,
      );
    }

    if (!channel.permissionsFor(userId)) return resolvedPermArr;

    const missingPerms = resolvedPermArr.filter((perm) => {
      const isValidPerm = Permissions.validPermissions.find((e) => e === perm);
      if (!isValidPerm) return true;
      return !channel.permissionsFor(userId)?.has(isValidPerm);
    });

    return missingPerms.length >= 1 ? missingPerms : true;
  };

  public static readonly displayPermissions = (
    perms: bigint[] | string[] | PermissionResolvable[],
    joinStr = ', ',
    noneStr = 'None',
  ) => {
    if (perms.length === 0) {
      return noneStr;
    }

    if (perms.every((e) => typeof e === 'string')) {
      return perms.join(joinStr);
    }

    return new PermissionsBitField(perms)
      .toArray()
      .map((e, ind) => {
        const perm = perms[ind];

        if (!perm) {
          return '';
        }

        return `${EmojiUtils.permissionEmojis[perm.toString()] ?? ''} ${StringUtils.splitOnUppercase(e)}`.trimStart();
      })
      .join(joinStr);
  };
}

export { PermLevel, Permissions };
