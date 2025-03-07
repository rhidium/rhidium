import winston from 'winston';
import WinstonRotator from 'winston-daily-rotate-file';
import { Client } from 'lib/client';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.align(),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

export interface FileLoggerOptions {
  /** The client that instantiated this logger */
  client: Client;
  /** Whats the max size of a file before it should rotate */
  maxSize?: string | undefined;
  /** Whats the max amount of files to keep before deleting the oldest */
  maxFiles?: string | undefined;
  /** Should rotated log files be archived, instead of deleted? */
  zippedArchive?: boolean | undefined;
  /** What directory should log files be stored in? */
  directory?: string | undefined;
  /** What date pattern should be used for log file names */
  datePattern?: string | undefined;
}

/**
 * This class is responsible for logging to files.
 * It's used by the console logger, and is not meant to be used directly.
 */
export class FileLogger {
  id: string;
  combinedTransport: WinstonRotator;
  errorTransport: WinstonRotator;
  warnTransport: WinstonRotator;
  infoTransport: WinstonRotator;
  httpTransport: WinstonRotator;
  verboseTransport: WinstonRotator;
  debugTransport: WinstonRotator;
  sillyTransport: WinstonRotator;
  readonly logger: winston.Logger;
  static readonly logFormat = logFormat;
  static readonly default = {
    maxSize: '5m',
    maxFiles: '14d',
    zippedArchive: true,
    directory: 'logs',
    datePattern: 'YYYY-MM-DD',
  };
  constructor(options: FileLoggerOptions) {
    this.id = options.client.cluster
      ? `cluster-${options.client.cluster.id}`
      : 'client';
    const resolvedDirectory = `${options.directory ?? FileLogger.default.directory}/${this.id}`;
    const commonOptions = {
      dirname: resolvedDirectory,
      datePattern: options.datePattern ?? FileLogger.default.datePattern,
      zippedArchive: options.zippedArchive ?? FileLogger.default.zippedArchive,
      maxSize: options.maxSize ?? FileLogger.default.maxSize,
      maxFiles: options.maxFiles ?? FileLogger.default.maxFiles,
    };
    this.errorTransport = new WinstonRotator({
      ...commonOptions,
      filename: 'error-%DATE%.log',
      level: 'error',
      auditFile: 'logs/audit/error.json',
    });
    this.warnTransport = new WinstonRotator({
      ...commonOptions,
      filename: 'warn-%DATE%.log',
      level: 'warn',
      auditFile: 'logs/audit/warn.json',
    });
    this.infoTransport = new WinstonRotator({
      ...commonOptions,
      filename: 'info-%DATE%.log',
      level: 'info',
      auditFile: 'logs/audit/info.json',
    });
    this.httpTransport = new WinstonRotator({
      ...commonOptions,
      filename: 'http-%DATE%.log',
      level: 'http',
      auditFile: 'logs/audit/http.json',
    });
    this.verboseTransport = new WinstonRotator({
      ...commonOptions,
      filename: 'verbose-%DATE%.log',
      level: 'verbose',
      auditFile: 'logs/audit/verbose.json',
    });
    this.debugTransport = new WinstonRotator({
      ...commonOptions,
      filename: 'debug-%DATE%.log',
      level: 'debug',
      auditFile: 'logs/audit/debug.json',
    });
    this.sillyTransport = new WinstonRotator({
      ...commonOptions,
      filename: 'silly-%DATE%.log',
      level: 'silly',
      auditFile: 'logs/audit/silly.json',
    });
    this.combinedTransport = new WinstonRotator({
      ...commonOptions,
      filename: 'combined-%DATE%.log',
      auditFile: 'logs/audit/combined.json',
    });
    this.logger = winston.createLogger({
      format: logFormat,
      levels: winston.config.npm.levels,
    });
  }
}
