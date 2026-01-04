import fs from 'fs';
import { createLogger, format, transports } from 'winston';
import colors from 'colors/safe.js';
import type { AbstractConfigSetLevels } from 'winston/lib/winston/config';
import type { AppConfig } from '@core/config/app';

const { combine, timestamp, printf, colorize, json } = format;

const levels: AbstractConfigSetLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

const logFormat = printf(({ level, message, timestamp }) => {
  return `${colors.cyan(`[${timestamp}]`)} ${colors.bold(level.toUpperCase())}: ${message}`;
});

let _privateLogger: ReturnType<typeof createLogger> | null = null;

/**
 * Creates a logger instance with the given configuration
 */
const createLoggerInstance = (config: AppConfig['logging']): ReturnType<typeof createLogger> => {
  const loggerInstance = createLogger({
    level: config.log_level,
    levels,
    format: combine(timestamp({ format: config.timestamp_format }), logFormat),
    transports: [],
  });
  
  if (config.use_console) {
    loggerInstance.add(
      new transports.Console({ format: combine(colorize(), logFormat) }),
    );
  }
  
  if (config.use_file) {
    const options = config.file_options;
  
    if (!fs.existsSync(options.directory)) {
      fs.mkdirSync(options.directory, { recursive: true });
    }
  
    loggerInstance.add(
      new transports.File({
        dirname: options.directory,
        filename: options.filename,
        format: combine(timestamp(), json()),
        level: options.level ?? config.log_level,
        maxFiles: options.max_files,
        maxsize: options.max_size,
        zippedArchive: options.zipped_archive,
        tailable: options.tailable,
      }),
    );
  }

  return loggerInstance;
};

/**
 * Creates a default logger instance with minimal configuration.
 * Used for early module imports before full initialization.
 */
const createDefaultLogger = (): ReturnType<typeof createLogger> => {
  return createLogger({
    level: 'info',
    levels,
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    transports: [
      new transports.Console({ format: combine(colorize(), logFormat) }),
    ],
  });
};

/**
 * Initialize the logger with application configuration.
 * This replaces the default logger with a fully configured one.
 */
const initializeLogger = (config: AppConfig['logging']) => {
  _privateLogger = createLoggerInstance(config);
};

/**
 * Get the logger instance.
 * Returns a lazy-initialized default logger if not yet configured.
 */
const logger = (): ReturnType<typeof createLogger> => {
  if (!_privateLogger) {
    _privateLogger = createDefaultLogger();
  }
  return _privateLogger;
};

export { logger, initializeLogger };
