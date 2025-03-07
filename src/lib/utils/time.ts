import { UnitConstants } from 'lib/constants';
import { TimestampStyles, TimestampStylesString, time } from 'discord.js';

const formatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

const unixNow = (): number => unixTs(Date.now());

const unixTs = (timestamp: number): number =>
  Math.floor(timestamp / UnitConstants.MS_IN_ONE_SECOND);

const discordTimestamp = (
  timestamp: number,
  style: TimestampStylesString,
): string => time(unixTs(timestamp), style);

const discordTimestampNow = (style: TimestampStylesString): string =>
  discordTimestamp(Date.now(), style);

const discordInfoTimestamp = (timestamp: number = Date.now()): string =>
  `${discordTimestamp(
    timestamp,
    TimestampStyles.ShortDateTime,
  )} (${discordTimestamp(timestamp, TimestampStyles.RelativeTime)})`;

const currentUTCDate = (): string => {
  const now = new Date();

  const formattedDate = formatter.formatToParts(now);
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

  const formattedTime = formatter.formatToParts(now);
  const hour =
    formattedTime.find((part) => part.type === 'hour')?.value || '00';
  const minute =
    formattedTime.find((part) => part.type === 'minute')?.value || '00';
  const second =
    formattedTime.find((part) => part.type === 'second')?.value || '00';

  return `${hour}:${minute}:${second}`;
};

/**
 * Takes milliseconds as input and returns the following formatting: 2 days, 5 minutes, 21 seconds
 * @param {number} ms Time in milliseconds
 * @param {number} maxParts Maximum number of time units to include in the output
 * @returns {string} A human-readable string
 */
const msToHumanReadableTime = (ms: number, maxParts = 2) => {
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
  } else return lastPart ?? 'Just now';
};

/**
 * Resolves human input (user prompts) to milliseconds
 * @param input 1 day, 2 hours, 15 minutes, 30 seconds (example)
 */
const humanTimeInputToMS = (input: string): number => {
  const parts = input.split(/, | and /);
  let ms = 0;
  for (const part of parts) {
    const [amount, unit] = part.split(' ');
    if (typeof amount !== 'string' || typeof unit !== 'string') continue;
    const resolvedAmount = Number(amount);
    switch (unit) {
      case 'day':
      case 'days':
      case 'd':
        ms += resolvedAmount * UnitConstants.MS_IN_ONE_DAY;
        break;
      case 'hour':
      case 'hours':
      case 'h':
        ms += resolvedAmount * UnitConstants.MS_IN_ONE_HOUR;
        break;
      case 'minute':
      case 'minutes':
      case 'm':
        ms += resolvedAmount * UnitConstants.MS_IN_ONE_MINUTE;
        break;
      case 'second':
      case 'seconds':
      case 's':
      default:
        ms += resolvedAmount * UnitConstants.MS_IN_ONE_SECOND;
        break;
    }
  }
  return ms;
};

const runTime = (start: bigint): string => {
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1e6;
  return `${ms.toFixed(3)}ms`;
};

const calculateAverageFromDateArr = (
  dates: Date[],
  interval: number,
): number => {
  // Create an object to store counts for each time interval
  const counts: Record<string, number> = {};

  // Iterate through the dates and count them in their respective intervals
  for (const date of dates) {
    const timeDiff = date.getTime(); // Get the timestamp of the date
    const intervalIndex = Math.floor(timeDiff / interval);

    if (counts[intervalIndex]) {
      counts[intervalIndex]++;
    } else {
      counts[intervalIndex] = 1;
    }
  }

  // Calculate the total count and number of intervals
  let totalCount = 0;
  let intervalCount = 0;

  for (const key in counts) {
    const val = counts[key];
    if (!val) continue;
    totalCount += val;
    intervalCount++;
  }

  // Calculate the average
  return totalCount / intervalCount;
};

export class TimeUtils {
  static readonly unixNow = unixNow;
  static readonly unixTs = unixTs;
  static readonly discordTimestamp = discordTimestamp;
  static readonly discordTimestampNow = discordTimestampNow;
  static readonly discordInfoTimestamp = discordInfoTimestamp;
  static readonly currentUTCDate = currentUTCDate;
  static readonly currentUTCTime = currentUTCTime;
  static readonly msToHumanReadableTime = msToHumanReadableTime;
  static readonly humanTimeInputToMS = humanTimeInputToMS;
  static readonly runTime = runTime;
  static readonly calculateAverageFromDateArr = calculateAverageFromDateArr;
}
