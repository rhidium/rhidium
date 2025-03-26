import { UnitConstants } from '@client/constants';
import { TimeUtils } from '@client/utils';
import colors from 'colors/safe.js';

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  HTTP = 3,
  VERBOSE = 4,
  DEBUG = 5,
  SILLY = 6,
}

type LogLevelsType = Record<keyof typeof LogLevel, LogLevel> & {
  readonly SUCCESS: LogLevel;
};

type LogLevelTags = {
  readonly [k in keyof typeof Logger.LogLevels]: string;
};

class Logger {
  private constructor() {}

  static readonly LogLevels: LogLevelsType = {
    ERROR: LogLevel.ERROR,
    WARN: LogLevel.WARN,
    INFO: LogLevel.INFO,
    HTTP: LogLevel.HTTP,
    VERBOSE: LogLevel.VERBOSE,
    DEBUG: LogLevel.DEBUG,
    SILLY: LogLevel.SILLY,
    SUCCESS: LogLevel.INFO,
  } as const;

  static readonly logLevelTags: LogLevelTags = {
    ERROR: '[ERROR]',
    WARN: '[WARN]',
    INFO: '[INFO]',
    HTTP: '[HTTP]',
    VERBOSE: '[VERBOSE]',
    DEBUG: '[DEBUG]',
    SILLY: '[SILLY]',
    SUCCESS: '[SUCCESS]',
  } as const;

  static readonly coloredTags: LogLevelTags = {
    ERROR: colors.red(Logger.logLevelTags.ERROR),
    WARN: colors.yellow(Logger.logLevelTags.WARN),
    INFO: colors.blue(Logger.logLevelTags.INFO),
    HTTP: colors.magenta(Logger.logLevelTags.HTTP),
    VERBOSE: colors.magenta(Logger.logLevelTags.VERBOSE),
    DEBUG: colors.bgMagenta(Logger.logLevelTags.DEBUG),
    SILLY: colors.gray(Logger.logLevelTags.SILLY),
    SUCCESS: colors.green(Logger.logLevelTags.SUCCESS),
  } as const;

  static readonly longestTagLength = Math.max(
    ...Object.values(Logger.coloredTags).map((t) => t.length),
  );

  static readonly padTag = (tag: string) =>
    `${tag}${' '.repeat(Logger.longestTagLength - tag.length)}:`;

  static readonly paddedTags: LogLevelTags = {
    ERROR: Logger.padTag(Logger.coloredTags.ERROR),
    WARN: Logger.padTag(Logger.coloredTags.WARN),
    INFO: Logger.padTag(Logger.coloredTags.INFO),
    HTTP: Logger.padTag(Logger.coloredTags.HTTP),
    VERBOSE: Logger.padTag(Logger.coloredTags.VERBOSE),
    DEBUG: Logger.padTag(Logger.coloredTags.DEBUG),
    SILLY: Logger.padTag(Logger.coloredTags.SILLY),
    SUCCESS: Logger.padTag(Logger.coloredTags.SUCCESS),
  } as const;

  static readonly timestamp = () =>
    colors.cyan(`[${TimeUtils.currentUTCTime()}]`);
  static readonly error = (...args: unknown[]) =>
    console.error(`${Logger.timestamp()} ${Logger.paddedTags.ERROR}`, ...args);
  static readonly warn = (...args: unknown[]) =>
    console.warn(`${Logger.timestamp()} ${Logger.paddedTags.WARN}`, ...args);
  static readonly info = (...args: unknown[]) =>
    console.info(`${Logger.timestamp()} ${Logger.paddedTags.INFO}`, ...args);
  static readonly http = (...args: unknown[]) =>
    console.debug(`${Logger.timestamp()} ${Logger.paddedTags.HTTP}`, ...args);
  static readonly verbose = (...args: unknown[]) =>
    console.debug(
      `${Logger.timestamp()} ${Logger.paddedTags.VERBOSE}`,
      ...args,
    );
  static readonly debug = (...args: unknown[]) =>
    console.debug(`${Logger.timestamp()} ${Logger.paddedTags.DEBUG}`, ...args);
  static readonly silly = (...args: unknown[]) =>
    console.debug(`${Logger.timestamp()} ${Logger.paddedTags.SILLY}`, ...args);
  static readonly success = (...args: unknown[]) =>
    console.info(`${Logger.timestamp()} ${Logger.paddedTags.SUCCESS}`, ...args);

  static readonly startLog = (...args: unknown[]) =>
    console.debug(
      `${Logger.timestamp()} ${Logger.paddedTags.DEBUG} ${colors.green('[START]')}`,
      ...args,
    );

  static readonly endLog = (...args: unknown[]) =>
    console.debug(
      `${Logger.timestamp()} ${Logger.paddedTags.DEBUG} ${colors.red('[ END ]')}`,
      ...args,
    );

  static readonly printRuntime = (hrtime: [number, number]) => {
    const timeSinceHrMs = Number(
      (
        process.hrtime(hrtime)[0] * UnitConstants.MS_IN_ONE_SECOND +
        hrtime[1] / UnitConstants.NS_IN_ONE_MS
      ).toFixed(2),
    );

    return `${colors.yellow(
      (timeSinceHrMs / UnitConstants.MS_IN_ONE_SECOND).toFixed(2),
    )} seconds (${colors.yellow(`${timeSinceHrMs}`)} ms)`;
  };
}

export { Logger };
