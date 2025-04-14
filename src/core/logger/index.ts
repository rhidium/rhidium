import fs from 'fs';
import { createLogger, format, transports } from 'winston';
import colors from 'colors/safe.js';
import type { AbstractConfigSetLevels } from 'winston/lib/winston/config';
import { appConfig } from '@core/config';

export * from './debug';

const config = appConfig.logging;

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

const logger = createLogger({
  level: config.log_level,
  levels,
  format: combine(timestamp({ format: config.timestamp_format }), logFormat),
  transports: [],
});

if (config.use_console) {
  logger.add(
    new transports.Console({ format: combine(colorize(), logFormat) }),
  );
}

if (config.use_file) {
  const options = config.file_options;

  if (!fs.existsSync(options.directory)) {
    fs.mkdirSync(options.directory, { recursive: true });
  }

  logger.add(
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

const Logger = logger;

export { Logger };
