import colors from 'colors/safe.js';
import { FileLogger, FileLoggerOptions } from '.';
import winston from 'winston';
import { TimeUtils } from '../utils';
import { UnitConstants } from '../constants';
import { Client } from '../client';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  HTTP = 3,
  VERBOSE = 4,
  DEBUG = 5,
  SILLY = 6,
}

export type MyLogLevels = {
  [k in keyof typeof LogLevel]: LogLevel;
} & {
  SUCCESS: LogLevel;
};

export type MyLogLevelTags = {
  [k in keyof typeof myLogLevels]: string;
};

export const myLogLevels: MyLogLevels = {
  ERROR: LogLevel.ERROR,
  WARN: LogLevel.WARN,
  INFO: LogLevel.INFO,
  HTTP: LogLevel.HTTP,
  VERBOSE: LogLevel.VERBOSE,
  DEBUG: LogLevel.DEBUG,
  SILLY: LogLevel.SILLY,
  SUCCESS: LogLevel.INFO,
};

export const logLevelTags: MyLogLevelTags = {
  ERROR: '[ERROR]',
  WARN: '[WARN]',
  INFO: '[INFO]',
  HTTP: '[HTTP]',
  VERBOSE: '[VERBOSE]',
  DEBUG: '[DEBUG]',
  SILLY: '[SILLY]',
  SUCCESS: '[SUCCESS]',
};

export const coloredTags: MyLogLevelTags = {
  ERROR: colors.red(logLevelTags.ERROR),
  WARN: colors.yellow(logLevelTags.WARN),
  INFO: colors.blue(logLevelTags.INFO),
  HTTP: colors.magenta(logLevelTags.HTTP),
  VERBOSE: colors.magenta(logLevelTags.VERBOSE),
  DEBUG: colors.bgMagenta(logLevelTags.DEBUG),
  SILLY: colors.gray(logLevelTags.SILLY),
  SUCCESS: colors.green(logLevelTags.SUCCESS),
};

const logLevelFromNumber = (level: number) => {
  switch (level) {
    case myLogLevels.ERROR:
      return 'ERROR';
    case myLogLevels.WARN:
      return 'WARN';
    case myLogLevels.INFO:
      return 'INFO';
    case myLogLevels.HTTP:
      return 'HTTP';
    case myLogLevels.VERBOSE:
      return 'VERBOSE';
    case myLogLevels.DEBUG:
      return 'DEBUG';
    case myLogLevels.SILLY:
      return 'SILLY';
    default:
      return 'UNKNOWN';
  }
};

const longestTagLength = Math.max(
  ...Object.values(coloredTags).map((t) => t.length),
);

const padTag = (tag: string) =>
  `${tag}${' '.repeat(longestTagLength - tag.length)}:`;

const paddedTags: MyLogLevelTags = {
  ERROR: padTag(coloredTags.ERROR),
  WARN: padTag(coloredTags.WARN),
  INFO: padTag(coloredTags.INFO),
  HTTP: padTag(coloredTags.HTTP),
  VERBOSE: padTag(coloredTags.VERBOSE),
  DEBUG: padTag(coloredTags.DEBUG),
  SILLY: padTag(coloredTags.SILLY),
  SUCCESS: padTag(coloredTags.SUCCESS),
};

const timestamp = () => colors.cyan(`[${TimeUtils.currentUTCTime()}]`);

const error = (...args: unknown[]) => {
  console.error(`${timestamp()} ${paddedTags.ERROR}`, ...args);
};

const warn = (...args: unknown[]) =>
  console.debug(`${timestamp()} ${paddedTags.WARN}`, ...args);

const info = (...args: unknown[]) =>
  console.info(`${timestamp()} ${paddedTags.INFO}`, ...args);

const http = (...args: unknown[]) =>
  console.debug(`${timestamp()} ${paddedTags.HTTP}`, ...args);

const verbose = (...args: unknown[]) =>
  console.debug(`${timestamp()} ${paddedTags.VERBOSE}`, ...args);

const debug = (...args: unknown[]) => {
  if (process.env.DEBUG_ENABLED === 'true')
    // Shouldn't use top-level references to process.env
    console.debug(`${timestamp()} ${paddedTags.DEBUG}`, ...args);
};
const silly = (...args: unknown[]) =>
  console.debug(`${timestamp()} ${paddedTags.SILLY}`, ...args);

const success = (...args: unknown[]) =>
  console.info(`${timestamp()} ${paddedTags.SUCCESS}`, ...args);

const startLog = (...args: unknown[]) =>
  console.debug(
    `${timestamp()} ${paddedTags.DEBUG} ${colors.green('[START]')}`,
    ...args,
  );

const endLog = (...args: unknown[]) =>
  console.debug(
    `${timestamp()} ${paddedTags.DEBUG} ${colors.red('[ END ]')}`,
    ...args,
  );

const consoleExecutionTime = (hrtime: [number, number]) => {
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

export interface LoggerOptions {
  /** The client that instantiated this logger */
  client: Client;
  /** Should there be a combined log file that holds everything? */
  combinedLogging?: boolean | undefined;
  /** Should there be an error log file? */
  errorLogging?: boolean | undefined;
  /** Should there be a warning log file? */
  warnLogging?: boolean | undefined;
  /** Should there be an info log file? */
  infoLogging?: boolean | undefined;
  /** Should there be an http log file? */
  httpLogging?: boolean | undefined;
  /** Should there be a verbose log file? */
  verboseLogging?: boolean | undefined;
  /** Should there be a debug log file? */
  debugLogging?: boolean | undefined;
  /** Should there be a silly log file? */
  sillyLogging?: boolean | undefined;
}

export class Logger implements LoggerOptions {
  client: Client;
  fileLogger: winston.Logger;
  fileLoggerEnabled: boolean;
  combinedLogging: boolean;
  errorLogging: boolean;
  warnLogging: boolean;
  infoLogging: boolean;
  httpLogging: boolean;
  verboseLogging: boolean;
  debugLogging: boolean;
  sillyLogging: boolean;
  constructor(options: LoggerOptions & FileLoggerOptions) {
    this.client = options.client;
    const fileLogger = new FileLogger({
      client: this.client,
      directory: options.directory,
      datePattern: options.datePattern,
      maxFiles: options.maxFiles,
      maxSize: options.maxSize,
      zippedArchive: options.zippedArchive,
    });

    this.combinedLogging = options.combinedLogging ?? true;
    this.errorLogging = options.errorLogging ?? true;
    this.warnLogging = options.warnLogging ?? true;
    this.infoLogging = options.infoLogging ?? true;
    this.httpLogging = options.httpLogging ?? true;
    this.verboseLogging = options.verboseLogging ?? true;
    this.debugLogging = options.debugLogging ?? true;
    this.sillyLogging = options.sillyLogging ?? true;

    this.fileLogger = fileLogger.logger;
    this.fileLoggerEnabled = process.env.NODE_ENV !== 'production';
    if (this.combinedLogging)
      fileLogger.logger.add(fileLogger.combinedTransport);
    if (this.errorLogging) fileLogger.logger.add(fileLogger.errorTransport);
    if (this.warnLogging) fileLogger.logger.add(fileLogger.warnTransport);
    if (this.infoLogging) fileLogger.logger.add(fileLogger.infoTransport);
    if (this.httpLogging) fileLogger.logger.add(fileLogger.httpTransport);
    if (this.verboseLogging) fileLogger.logger.add(fileLogger.verboseTransport);
    if (this.debugLogging) fileLogger.logger.add(fileLogger.debugTransport);
    if (this.sillyLogging) fileLogger.logger.add(fileLogger.sillyTransport);
  }

  error = (...args: unknown[]) => {
    error(...args);
    if (this.fileLoggerEnabled) this.fileLogger.error(JSON.stringify(args));
  };

  warn = (...args: unknown[]) => {
    warn(...args);
    if (this.fileLoggerEnabled) this.fileLogger.warn(JSON.stringify(args));
  };

  info = (...args: unknown[]) => {
    info(...args);
    if (this.fileLoggerEnabled) this.fileLogger.info(JSON.stringify(args));
  };

  http = (...args: unknown[]) => {
    http(...args);
    if (this.fileLoggerEnabled) this.fileLogger.http(JSON.stringify(args));
  };

  verbose = (...args: unknown[]) => {
    verbose(...args);
    if (this.fileLoggerEnabled) this.fileLogger.verbose(JSON.stringify(args));
  };

  debug = (...args: unknown[]) => {
    debug(...args);
    if (this.fileLoggerEnabled) this.fileLogger.debug(JSON.stringify(args));
  };

  silly = (...args: unknown[]) => {
    silly(...args);
    if (this.fileLoggerEnabled) this.fileLogger.silly(JSON.stringify(args));
  };

  success = (...args: unknown[]) => {
    success(...args);
    if (this.fileLoggerEnabled) this.fileLogger.info(JSON.stringify(args));
  };

  startLog = (...args: unknown[]) => {
    startLog(...args);
    if (this.fileLoggerEnabled) this.fileLogger.debug(JSON.stringify(args));
  };

  endLog = (...args: unknown[]) => {
    endLog(...args);
    if (this.fileLoggerEnabled) this.fileLogger.debug(JSON.stringify(args));
  };

  readonly logLevelFromNumber = logLevelFromNumber;
  readonly padTag = padTag;
  readonly timestamp = timestamp;
  readonly consoleExecutionTime = consoleExecutionTime;

  readonly consoleColors = colors;
  readonly myLogLevels = myLogLevels;
  readonly logLevelTags = logLevelTags;
  readonly coloredTags = coloredTags;
  readonly paddedTags = paddedTags;
  readonly longestTagLength = longestTagLength;

  // These methods that start with an _ don't log to (audit) files, should
  // only be used when client context isn't available
  static readonly _error = error;
  static readonly _warn = warn;
  static readonly _info = info;
  static readonly _http = http;
  static readonly _verbose = verbose;
  static readonly _debug = debug;
  static readonly _silly = silly;
  static readonly _success = success;
  static readonly _startLog = startLog;
  static readonly _endLog = endLog;
}

export const logger = Logger;
