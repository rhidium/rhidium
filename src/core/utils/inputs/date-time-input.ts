import * as chrono from 'chrono-node';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { AutoCompleteOption } from '../../commands';

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

  static readonly timezoneAutoCompleteOption = ({
    name = 'timezone',
    description = 'Select a timezone from the available options',
    required = false,
  }: {
    name?: string;
    description?: string;
    required?: boolean;
  }) =>
    new AutoCompleteOption<string>({
      name: name ?? 'timezone',
      description: description ?? 'Select a timezone',
      required: required ?? false,
      lowercaseQuery: true,
      run: async (query) => {
        const filtered = this.lowercasedTimezones.filter(
          (tz) => tz.indexOf(query) >= 0,
        );

        return filtered.map((tz) => ({
          name: this.resolveLowercasedTimezone(tz) ?? tz,
          value: tz,
        }));
      },
      resolveValue: (value) => {
        if (!DateTimeInput.lowercasedTimezones.includes(value)) {
          return null;
        }

        return DateTimeInput.resolveLowercasedTimezone(value) ?? null;
      },
    });

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
}

export {
  DateTimeInput,
  type HumanDateTimeInputOptions,
  type DateSingleResult,
  type DateTimeResult,
};
