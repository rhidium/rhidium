import * as chrono from 'chrono-node';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { SlashCommandStringOption } from 'discord.js';

type HumanDateTimeInputOptions = {
  /**
   * The human-readable input to parse, a couple of example include:
   *
   * - "tomorrow at 3pm"
   * - "at 5pm"
   * - "from 3pm to 5pm"
   * - "next week"
   * - "in 2 hours"
   * - "next month"
   * - "next year"
   */
  input: string;
  /**
   * The timezone to parse the input in, e.g. "America/New_York"
   */
  timezone: string;
  /**
   * The reference date to parse the input relative to
   */
  referenceDate?: Date;
};

type DateSingleResult = readonly [Date, Date, Date | null];
type DateTimeResult = DateSingleResult[] | undefined;

class DateTimeInput {
  static readonly timezones = Intl.supportedValuesOf('timeZone');
  static readonly lowercasedTimezones = DateTimeInput.timezones.map((tz) =>
    tz.toLowerCase(),
  );
  static readonly resolveLowercasedTimezone = (timezone: string) =>
    DateTimeInput.timezones[
      DateTimeInput.lowercasedTimezones.indexOf(timezone)
    ];

  static readonly parseHumanDateTimeInput = ({
    input,
    timezone,
    referenceDate = new Date(),
  }: HumanDateTimeInputOptions): DateTimeResult => {
    const referenceDateInZone = toZonedTime(referenceDate, timezone);
    const parsed = chrono.parse(input, referenceDateInZone, {
      forwardDate: true,
    });

    if (parsed.length > 0) {
      return parsed.map((range) => {
        const { start, end } = range;
        return [
          fromZonedTime(referenceDateInZone, timezone),
          fromZonedTime(start.date(), timezone),
          end ? fromZonedTime(end.date(), timezone) : null,
        ] as const;
      });
    }

    const parsedResult = chrono.parseDate(input, referenceDateInZone, {
      forwardDate: true,
    });

    if (!parsedResult) {
      return undefined;
    }

    return [
      [
        fromZonedTime(referenceDateInZone, timezone),
        fromZonedTime(parsedResult, timezone),
        null,
      ],
    ] as const;
  };

  static readonly formatSuffixShort = ' (e.g. at 2pm)';
  static readonly formatSuffix =
    ' (e.g. tomorrow at 2pm, next week, in 2 hours)';
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
      .setName(options?.name ?? 'date')
      .setDescription(
        `${this.withFormatSuffix(options?.description ?? 'The date', options?.shortSuffix ? 'short' : options?.omitSuffix)}.`,
      )
      .setRequired(options?.required ?? false)
      .setMinLength(1)
      .setMaxLength(100);
}

export {
  DateTimeInput,
  type HumanDateTimeInputOptions,
  type DateSingleResult,
  type DateTimeResult,
};
