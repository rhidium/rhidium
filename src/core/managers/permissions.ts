import { GuildMember, Snowflake } from 'discord.js';

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
