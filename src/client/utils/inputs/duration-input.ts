import {
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  SlashCommandStringOption,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { UnitConstants } from '@client/constants';

class DurationInput {
  /**
   * Regular expression to match time units
   */
  static readonly regex =
    /(\d+)\s*(d|day|days|h|hour|hours|m|minute|minutes|s|second|seconds)/gi;

  /**
   * Supported time units in milliseconds
   */
  static readonly timeUnits: Record<string, number> = {
    d: UnitConstants.MS_IN_ONE_DAY,
    h: UnitConstants.MS_IN_ONE_HOUR,
    m: UnitConstants.MS_IN_ONE_MINUTE,
    s: UnitConstants.MS_IN_ONE_SECOND,
  };

  /**
   * Resolves human input (user prompts) to milliseconds
   *
   * Supported formats (please note that spaces are ignored):
   * - Full: `1 day, 2 hours, 15 minutes, and 30 seconds`
   * - Short: `1d, 2h, 15m, 30s`
   * - Mixed: `1 day,2h,15m,30s`
   * @param input The human input string
   * @returns The time in milliseconds
   */
  static readonly inputToMs = (input: string, maxMs?: number): number => {
    let match;
    let totalMs = 0;

    while ((match = this.regex.exec(input.replace(/\s+/g, ''))) !== null) {
      const value = match[1] ? parseInt(match[1], 10) : undefined;
      const unit = match[2] ? match[2][0] : undefined;
      const timeUnit = unit ? this.timeUnits[unit] : undefined;

      if (typeof value !== 'undefined' && !isNaN(value) && timeUnit) {
        totalMs += value * timeUnit;
      }
    }

    if (typeof maxMs === 'undefined') {
      return totalMs;
    }

    return Math.min(totalMs, maxMs);
  };

  static readonly formatSuffixShort = ' (e.g. 2h, 15m)';
  static readonly formatSuffix = ' (e.g. 1d, 2h, 15m, 30s)';
  static readonly withFormatSuffix = (
    input: string,
    omitSuffix: boolean | 'short' = false,
  ) =>
    omitSuffix === true
      ? input
      : `${input}${omitSuffix === 'short' ? this.formatSuffixShort : this.formatSuffix}`;

  static readonly addOptionHandler = (
    i: SlashCommandStringOption,
    options?: {
      required?: boolean;
      name?: string;
      description?: string;
      omitSuffix?: boolean;
      shortSuffix?: boolean;
    },
  ) =>
    i
      .setName(options?.name ?? 'duration')
      .setDescription(
        `${this.withFormatSuffix(options?.description ?? 'The duration', options?.shortSuffix ? 'short' : options?.omitSuffix)}.`,
      )
      .setRequired(options?.required ?? false)
      .setMinLength(1)
      .setMaxLength(100);

  static readonly durationTextInput = (options?: {
    customId?: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    omitSuffix?: boolean;
    shortSuffix?: boolean | 'short';
  }) => {
    const {
      customId = 'duration',
      label = 'Duration',
      placeholder = `The duration ${this.formatSuffix}`,
      required = false,
      omitSuffix = false,
      shortSuffix = false,
    } = options ?? {};
    const style =
      placeholder.length > 50 ? TextInputStyle.Paragraph : TextInputStyle.Short;

    return new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      [
        new TextInputBuilder()
          .setCustomId(customId)
          .setStyle(style)
          .setLabel(label)
          .setPlaceholder(
            `${this.withFormatSuffix(placeholder ?? 'The duration', shortSuffix ? 'short' : omitSuffix)}.`,
          )
          .setMinLength(1)
          .setMaxLength(100)
          .setRequired(required),
      ],
    );
  };
}

export { DurationInput };
