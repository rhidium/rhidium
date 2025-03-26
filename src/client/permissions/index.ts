import { appConfig } from '@client/config';
import { EmojiUtils, StringUtils } from '@client/utils';
import {
  APIInteractionGuildMember,
  Guild,
  GuildChannel,
  GuildMember,
  GuildTextBasedChannel,
  PermissionFlagsBits,
  PermissionsBitField,
  Snowflake,
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

interface PermissionLevelConfiguration {
  name: keyof typeof PermLevel;
  level: PermLevel;
  hasLevel(
    config: ClientPermissionOptions,
    member: GuildMember,
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
      hasLevel: (_config, member) =>
        Promise.resolve(
          member.permissions.has(PermissionFlagsBits.ManageMessages),
        ),
    },
    {
      name: 'Administrator',
      level: PermLevel.Administrator,
      hasLevel: (_config, member) =>
        Promise.resolve(
          member.permissions.has(PermissionFlagsBits.Administrator),
        ),
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

  public static readonly validPermissions = Object.values(
    PermissionsBitField.Flags,
  );
  public static readonly filterInvalidPermissions = (perms: bigint[]) =>
    perms.filter((perm) => !Permissions.validPermissions.includes(perm));

  public static readonly resolveForMember = async (
    member: GuildMember | APIInteractionGuildMember | null,
    guild: Guild | null,
  ): Promise<PermLevel> => {
    if (member === null || guild === null) {
      return PermLevel.User;
    }

    const resolvedMember = !(member instanceof GuildMember)
      ? ((await guild.members.fetch(member.user.id).catch(() => null)) ?? null)
      : member;

    if (resolvedMember === null) {
      return PermLevel.User;
    }

    for await (const { level, hasLevel } of Permissions.sortedLevels) {
      if (await hasLevel(Permissions.config, resolvedMember)) return level;
    }

    return PermLevel.User;
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
    perms: bigint[] | string[],
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
