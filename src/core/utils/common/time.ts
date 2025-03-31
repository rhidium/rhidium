import { UnitConstants } from '@core/constants';
import {
  Locale,
  TimestampStyles,
  TimestampStylesString,
  time,
} from 'discord.js';

const formatterFromLocale = (
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
) => new Intl.DateTimeFormat(locale, options);

const unix = (timestamp: number): number =>
  Math.floor(timestamp / UnitConstants.MS_IN_ONE_SECOND);

const unixNow = (): number => unix(Date.now());

const discordTimestamp = (
  timestamp: number,
  style: TimestampStylesString,
): string => time(unix(timestamp), style);

const discordTimestampNow = (style: TimestampStylesString): string =>
  discordTimestamp(Date.now(), style);

const discordInfoTimestamp = (timestamp: number = Date.now()): string =>
  `${discordTimestamp(
    timestamp,
    TimestampStyles.ShortDateTime,
  )} (${discordTimestamp(timestamp, TimestampStyles.RelativeTime)})`;

const humanReadableMs = (
  ms: number,
  maxParts = 2,
  msDisplay: string | ((ms: number) => string) = 'Just now',
) => {
  const days = (ms / UnitConstants.MS_IN_ONE_DAY) | 0;
  const hours =
    ((ms % UnitConstants.MS_IN_ONE_DAY) / UnitConstants.MS_IN_ONE_HOUR) | 0;
  const minutes =
    ((ms % UnitConstants.MS_IN_ONE_HOUR) / UnitConstants.MS_IN_ONE_MINUTE) | 0;
  const seconds =
    ((ms % UnitConstants.MS_IN_ONE_MINUTE) / UnitConstants.MS_IN_ONE_SECOND) |
    0;

  const parts = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);

  const formattedParts = parts.slice(0, maxParts);
  const lastPart = formattedParts.pop();

  if (formattedParts.length > 0) {
    return `${formattedParts.join(', ')}${formattedParts.length > 1 ? ',' : ''} and ${lastPart}`;
  } else
    return (
      lastPart ?? (typeof msDisplay === 'function' ? msDisplay(ms) : msDisplay)
    );
};

const hrTimeToMs = (hrTime: [number, number]): number =>
  hrTime[0] * 1e3 + hrTime[1] / 1e6;

const bigIntDurationToHumanReadable = (start: bigint): string => {
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1e6;
  return `${ms.toFixed(3)}ms`;
};

const occurrencesPerInterval = (dates: Date[], interval: number): number => {
  let totalCount = 0;
  let intervalCount = 0;
  const map: Record<string, number> = {};

  // Iterate through the dates and count them in their respective intervals
  for (const date of dates) {
    const timeDiff = date.getTime();
    const intervalIndex = Math.floor(timeDiff / interval);

    if (map[intervalIndex]) {
      map[intervalIndex]++;
    } else {
      map[intervalIndex] = 1;
    }
  }

  // Calculate the total count and number of intervals
  for (const key in map) {
    const val = map[key];
    if (!val) continue;
    totalCount += val;
    intervalCount++;
  }

  // Calculate the average
  return totalCount / intervalCount;
};

const _utcFormatter = formatterFromLocale(Locale.EnglishUS, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const currentUTCDate = (): string => {
  const now = new Date();

  const formattedDate = _utcFormatter.formatToParts(now);
  const year =
    formattedDate.find((part) => part.type === 'year')?.value || '0000';
  const month =
    formattedDate.find((part) => part.type === 'month')?.value || '00';
  const day = formattedDate.find((part) => part.type === 'day')?.value || '00';

  TimestampStyles;

  return `${year}-${month}-${day}`;
};

const currentUTCTime = (): string => {
  const now = new Date();

  const formattedTime = _utcFormatter.formatToParts(now);
  const hour =
    formattedTime.find((part) => part.type === 'hour')?.value || '00';
  const minute =
    formattedTime.find((part) => part.type === 'minute')?.value || '00';
  const second =
    formattedTime.find((part) => part.type === 'second')?.value || '00';

  return `${hour}:${minute}:${second}`;
};

class TimeUtils {
  /**
   * Returns a formatter for a given (discord.js) locale
   * @param locale The locale to format the date for
   * @param options The formatting options, if any
   * @returns The date formatter
   */
  static readonly formatterFromLocale = formatterFromLocale;
  /**
   * Returns a Unix timestamp from a JavaScript timestamp
   * @param timestamp The JavaScript timestamp
   * @returns The Unix timestamp
   */
  static readonly unix = unix;
  /**
   * Returns the current time as a Unix timestamp
   * @returns The current Unix timestamp
   */
  static readonly unixNow = unixNow;
  /**
   * Returns a Discord-formatted timestamp
   * @param timestamp The timestamp to format
   * @param style The style of the timestamp
   * @returns The formatted timestamp string
   */
  static readonly discordTimestamp = discordTimestamp;
  /**
   * Returns the current time as a Discord-formatted timestamp
   * @param style The style of the timestamp
   * @returns The formatted timestamp string
   */
  static readonly discordTimestampNow = discordTimestampNow;
  /**
   * Returns a Discord-formatted timestamp with both relative and absolute time
   * @param timestamp The timestamp to format
   * @returns The formatted timestamp string
   */
  static readonly discordInfoTimestamp = discordInfoTimestamp;
  /**
   * Converts milliseconds to a human-readable format
   * @param ms The time in milliseconds
   * @param maxParts The maximum number of time units to include
   * @returns A human-readable string
   */
  static readonly humanReadableMs = humanReadableMs;
  /**
   * Converts a hrTime tuple to milliseconds
   * @param hrTime The hrTime tuple
   * @returns The time in milliseconds
   */
  static readonly hrTimeToMs = hrTimeToMs;
  /**
   * Displays the duration of a bigInt since a given `start` time
   * @param start The start time as a bigInt
   * @returns The duration as a human-readable string
   */
  static readonly bigIntDurationToHumanReadable = bigIntDurationToHumanReadable;
  /**
   * Calculates the average number of occurrences per interval
   * @param dates The dates to calculate the occurrences from
   * @param interval The interval to calculate the average for
   * @returns The average number of occurrences per interval
   */
  static readonly occurrencesPerInterval = occurrencesPerInterval;
  /**
   * Returns the current date in UTC
   * @returns The current date in UTC
   */
  static readonly currentUTCDate = currentUTCDate;
  /**
   * Returns the current time in UTC
   * @returns The current time in UTC
   */
  static readonly currentUTCTime = currentUTCTime;
}

export { TimeUtils };
