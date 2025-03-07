import { BaseInteraction } from 'discord.js';
import { UnitConstants } from 'lib/constants';

/**
 * Available command cooldown types
 */
export enum CommandCooldownType {
  User = 0,
  Member = 1,
  Guild = 2,
  Channel = 3,
  Global = 4,
}

/**
 * Get the resource ID for a command cooldown -
 */
export const cooldownResourceId = <I extends BaseInteraction>(
  type: CommandCooldownType,
  interaction: I,
): 'null' | string =>
  type === CommandCooldownType.User
    ? interaction.user.id
    : type === CommandCooldownType.Member
      ? `${interaction.guildId}${interaction.user.id}`
      : type === CommandCooldownType.Channel
        ? `${interaction.channelId}`
        : type === CommandCooldownType.Guild
          ? `${interaction.guildId}`
          : `${CommandCooldownType.Global}`;

export const cooldownTypeValues = Object.values(CommandCooldownType);
export const resolveCooldownType = (cooldownType: number) =>
  cooldownTypeValues[cooldownType];

/**
 * Represents on object with options to configure command cooldown/throttling
 */
export interface CommandThrottleOptions {
  /**
   * Whether the cooldown is enabled and command throttling applies
   */
  enabled?: boolean;
  /**
   * The type of command throttling applied to this command
   */
  type?: CommandCooldownType;
  /**
   * The amount of times the command can be used within the specified duration
   */
  usages?: number;
  /**
   * The duration (in ms) usages should be tracked for
   */
  duration?: number;
  /**
   * Whether the cooldown should persist across restarts
   *
   * NOTE: This is ONLY a convenience option for the developer, we do
   * not implement any persistence for you, you must do so yourself by
   * using persistent command cooldown middleware. We have an example
   * of this on the main template/example repository
   *
   * @see https://github.com/rhidium/template
   */
  persistent?: boolean;
}

export class CommandThrottle implements CommandThrottleOptions {
  enabled: boolean;
  type: CommandCooldownType;
  usages: number;
  duration: number;
  persistent = false;
  static readonly default = {
    enabled: true,
    type: CommandCooldownType.User,
    usages: 2,
    duration: 15 * UnitConstants.MS_IN_ONE_SECOND,
    persistent: false,
  };
  constructor(options: CommandThrottleOptions) {
    this.enabled = options.enabled ?? CommandThrottle.default.enabled;
    this.type = options.type ?? CommandThrottle.default.type;
    this.usages = options.usages ?? CommandThrottle.default.usages;
    this.duration = options.duration ?? CommandThrottle.default.duration;
    this.persistent = options.persistent ?? CommandThrottle.default.persistent;
  }
}
