/**
 * Configuration types and schemas for Rhidium using Zod
 */
import { z } from 'zod/v4';

// Config Schema
export const ConfigSchema = z.object({
  client: z.object({
    id: z.string().describe('Discord application ID'),
    token: z.string().describe('Discord bot token'),
    development_server_id: z.string().nullable().optional().describe('Guild ID for development/testing'),
  }),
  permissions: z.object({
    owner_id: z.string().describe('Discord user ID of the bot owner'),
    system_administrator_ids: z.array(z.string()).describe('List of system administrator user IDs'),
    developer_ids: z.array(z.string()).describe('List of developer user IDs'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

// Extended Config Schema
export const ExtendedConfigSchema = z.object({
  logging: z.object({
    log_level: z.string().describe('Winston log level'),
    timestamp_format: z.string().describe('Date format for timestamps'),
    use_console: z.boolean().describe('Enable console logging'),
    use_file: z.boolean().describe('Enable file logging'),
    file_options: z.object({
      directory: z.string().describe('Log directory path'),
      filename: z.string().describe('Log filename'),
      level: z.string().optional().describe('File-specific log level'),
      json: z.boolean().describe('Log as JSON'),
      max_size: z.number().describe('Max log file size in bytes'),
      max_files: z.number().describe('Max number of log files to keep'),
      tailable: z.boolean().describe('Enable tailable logs'),
      zipped_archive: z.boolean().describe('Compress archived logs'),
    }),
  }),
  colors: z.object({
    primary: z.string().describe('Primary color (hex or Discord color)'),
    secondary: z.string().describe('Secondary color'),
    success: z.string().describe('Success color'),
    error: z.string().describe('Error color'),
    info: z.string().describe('Info color'),
    warning: z.string().describe('Warning color'),
    debug: z.string().describe('Debug color'),
    waiting: z.string().describe('Waiting color'),
  }),
  emojis: z.object({
    primary: z.string().describe('Primary emoji'),
    secondary: z.string().describe('Secondary emoji'),
    success: z.string().describe('Success emoji'),
    error: z.string().describe('Error emoji'),
    info: z.string().describe('Info emoji'),
    warning: z.string().describe('Warning emoji'),
    debug: z.string().describe('Debug emoji'),
    waiting: z.string().describe('Waiting emoji'),
    separator: z.string().describe('Separator emoji'),
  }),
  urls: z.object({
    github: z.url().describe('GitHub repository URL'),
    docs: z.url().describe('Documentation URL'),
    website: z.url().describe('Website URL'),
    support_server: z.url().describe('Support server/community URL'),
  }),
});

export type ExtendedConfig = z.infer<typeof ExtendedConfigSchema>;
