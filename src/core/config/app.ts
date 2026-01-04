/* eslint-disable n/no-unpublished-import */
import { Colors, type HexColorString, resolveColor } from 'discord.js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { ConfigSchema, ExtendedConfigSchema, type Config, type ExtendedConfig } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * User-configurable config directory path.
 * Can be set via setConfigDirectory() before the config is loaded.
 */
let userConfigDirectory: string | null = null;

/**
 * Set the directory where config files should be loaded from.
 * This must be called before any config is accessed.
 * 
 * @param directory - Absolute path to the config directory
 * @example
 * ```ts
 * import { setConfigDirectory } from 'rhidium';
 * setConfigDirectory('/path/to/my/project/config');
 * ```
 */
export const setConfigDirectory = (directory: string): void => {
  if (!existsSync(directory)) {
    throw new Error(`Config directory does not exist: ${directory}`);
  }
  userConfigDirectory = directory;
};

/**
 * Formats Zod validation errors into a readable error message
 */
const formatZodErrors = (errors: z.ZodError): string => {
  return errors.issues
    .map(error => {
      const path = error.path.length > 0 ? error.path.join('.') : 'root';
      return `  - ${path}: ${error.message}`;
    })
    .join('\n');
};

/**
 * Attempts to load a JSON file from the configured or detected config directory.
 * Validates the loaded config against the provided Zod schema.
 * Checks in order:
 * 1. User-specified directory (via setConfigDirectory())
 * 2. RHIDIUM_CONFIG_DIR environment variable
 * 3. Parent project's config directory (for git submodule usage)
 * 4. Local config directory (for standalone usage)
 * 
 * @param filename - The name of the config file to load
 * @param schema - Zod schema to validate the config against
 * @returns The validated config
 * @throws Error if the file is not found, cannot be parsed, or fails validation
 */
const loadConfigFile = <T>(filename: string, schema: z.ZodSchema<T>): T => {
  const locations: string[] = [];

  // 1. User-specified config directory
  if (userConfigDirectory) {
    locations.push(resolve(userConfigDirectory, filename));
  }

  // 2. Environment variable
  if (process.env['RHIDIUM_CONFIG_DIR']) {
    locations.push(resolve(process.env['RHIDIUM_CONFIG_DIR'], filename));
  }

  // 3. Parent project config (when used as submodule)
  locations.push(resolve(__dirname, '../../../../config', filename));

  // 4. Local config (standalone)
  locations.push(resolve(__dirname, '../../../config', filename));

  let parsedData: unknown;
  let loadedPath: string | null = null;

  // Try to load from each location
  for (const location of locations) {
    if (existsSync(location)) {
      try {
        const content = readFileSync(location, 'utf-8');
        parsedData = JSON.parse(content);
        loadedPath = location;
        break;
      } catch (error) {
        throw new Error(
          `Failed to parse ${filename} at ${location}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  if (!parsedData || loadedPath === null) {
    throw new Error(
      `Config file "${filename}" not found. Checked locations:\n${locations.map(l => `  - ${l}`).join('\n')}\n\n` +
      `To fix this, either:\n` +
      `  1. Call setConfigDirectory('/path/to/config') before importing the client\n` +
      `  2. Set RHIDIUM_CONFIG_DIR environment variable\n` +
      `  3. Place config files in a supported location`
    );
  }

  // Validate against schema
  const validation = schema.safeParse(parsedData);
  if (!validation.success) {
    throw new Error(
      `Invalid configuration in "${filename}" (loaded from ${loadedPath}):\n\n` +
      formatZodErrors(validation.error) +
      '\n\nPlease check your config file and ensure all required fields are present and have correct types.'
    );
  }

  return validation.data as T;
};

/**
 * Loads package.json from the rhidium installation directory.
 */
const loadPackageJson = () => {
  const location = resolve(__dirname, '../../../package.json');
  
  if (!existsSync(location)) {
    throw new Error(`package.json not found at ${location}`);
  }

  try {
    const content = readFileSync(location, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse package.json at ${location}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const config = loadConfigFile<Config>('config.json', ConfigSchema);
const extendedConfig = loadConfigFile<ExtendedConfig>('extended-config.json', ExtendedConfigSchema);
const pkg = loadPackageJson();

const colorResolver = (color: string, fallback: number): number => {
  if (!color.startsWith('#')) return fallback;

  return resolveColor(color as HexColorString);
};

export const appConfig = {
  ...config,
  client: {
    ...config.client,
    development_server_id:
      'development_server_id' in config.client
        ? (config.client.development_server_id ?? null)
        : process.env['NODE_ENV'] === 'development'
          ? (process.env['DEVELOPMENT_SERVER_ID'] ?? null)
          : null,
  },
  ...extendedConfig,
  colors: {
    primary: colorResolver(extendedConfig.colors.primary, Colors.Blurple),
    secondary: colorResolver(extendedConfig.colors.secondary, Colors.Grey),
    success: colorResolver(extendedConfig.colors.success, Colors.Green),
    warning: colorResolver(extendedConfig.colors.warning, Colors.Orange),
    error: colorResolver(extendedConfig.colors.error, Colors.Red),
    debug: colorResolver(extendedConfig.colors.debug, Colors.Purple),
    info: colorResolver(extendedConfig.colors.info, Colors.Blue),
    waiting: colorResolver(extendedConfig.colors.waiting, Colors.Yellow),
  },
  pkg,
};

export type AppConfig = typeof appConfig;