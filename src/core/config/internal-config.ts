import { Colors, resolveColor } from 'discord.js';
import { AppConfig, NodeEnvValues, UserConfigOptions } from './types';
import { validateConfig } from './validate';
import { userConfig as _userConfig } from './user-config';
import { resolveColorConfig } from '../client';

/**
 * Resolve our active NODE_ENV, which can be overwritten through cli arguments
 * and .env files
 *
 * @returns {NodeEnvValues} The resolved NODE_ENV value
 */
export const resolveNodeEnvironment = (
  userConfig: UserConfigOptions,
): NodeEnvValues => {
  // Resolve CLI arguments
  const cliArguments = process.argv.slice(2);
  const envCliArg = cliArguments.find((arg) => arg.startsWith('--NODE_ENV='));
  const [, envCliArgValue] = envCliArg?.split('=') ?? [];

  // CLI Argument > .env file value > default(production)
  const userValue = envCliArgValue ?? process.env.NODE_ENV;

  // Only allow whitelisted values
  const whitelistedValue =
    typeof userValue === 'undefined' || userValue === 'production'
      ? 'production'
      : userValue === 'staging'
        ? 'staging'
        : 'development';

  // Sync our CLI argument with our process.env.NODE_ENV
  if (!process.env.NODE_ENV && whitelistedValue)
    process.env.NODE_ENV = whitelistedValue;

  // Sync our process debugging environmental variable
  // This is used when appConfig#debug.debug_mode_enabled is true
  // to avoid creating circular imports in essential, re-usable modules
  // like the logger
  if (!process.env.DEBUG_ENABLED && userConfig.debug?.debug_mode_enabled)
    process.env.DEBUG_ENABLED = 'true';

  return whitelistedValue;
};

/**
 * Apply sensible defaults to our user config and include internal config
 */
export const resolveAppConfig = (userConfig: UserConfigOptions): AppConfig => {
  const appConfig: AppConfig = {
    ...userConfig,
    // Resolve our NODE_ENV from cli arguments and .env files
    // for reference in config files
    NODE_ENV: resolveNodeEnvironment(userConfig),
    DRY_RUN: process.env.DRY_RUN === 'true',
    // Set defaults for any optional/missing values
    debug: {
      debug_mode_enabled: userConfig.debug?.debug_mode_enabled ?? false,
      command_throttling: userConfig.debug?.command_throttling ?? false,
      localizations: userConfig.debug?.localizations ?? false,
      chat_input_command_api_data:
        userConfig.debug?.chat_input_command_api_data ?? false,
      command_data: userConfig.debug?.command_data ?? false,
      interactions: userConfig.debug?.interactions ?? false,
      modal_submit_execution_time:
        userConfig.debug?.modal_submit_execution_time ?? false,
      autocomplete_execution_time:
        userConfig.debug?.autocomplete_execution_time ?? false,
    },
    emojis: {
      success: userConfig.emojis?.success ?? '☑️',
      error: userConfig.emojis?.error ?? '❌',
      info: userConfig.emojis?.info ?? 'ℹ️',
      warning: userConfig.emojis?.warning ?? '⚠️',
      debug: userConfig.emojis?.debug ?? '🐛',
      waiting: userConfig.emojis?.waiting ?? '⏳',
      separator: userConfig.emojis?.separator ?? '•',
    },
    colors: {
      primary: resolveColorConfig(userConfig.colors?.primary, Colors.Blurple),
      secondary: resolveColorConfig(
        userConfig.colors?.secondary,
        Colors.Greyple,
      ),
      success: resolveColorConfig(userConfig.colors?.success, Colors.Green),
      debug: resolveColorConfig(
        userConfig.colors?.debug,
        resolveColor('#af86fc'),
      ),
      error: resolveColorConfig(userConfig.colors?.error, Colors.Red),
      warning: resolveColorConfig(
        userConfig.colors?.warning,
        resolveColor('#ffc61b'),
      ),
      info: resolveColorConfig(
        userConfig.colors?.info,
        resolveColor('#77c8d5'),
      ),
      waiting: resolveColorConfig(
        userConfig.colors?.waiting,
        resolveColor('#f7b977'),
      ),
    },
  };
  validateConfig(appConfig);
  return appConfig;
};

/**
 * Singleton that represent our local/runtime configuration - enums
 * have to be manually resolved due to JSON schema not supporting them
 */
export const appConfig = resolveAppConfig({
  ..._userConfig,
  $schema: _userConfig.$schema,
  api: _userConfig.api,
  client: _userConfig.client,
  permissions: _userConfig.permissions,
  debug: _userConfig.debug ?? {},
  emojis: _userConfig.emojis ?? {},
  colors: _userConfig.colors ?? {},
  cooldown: _userConfig.cooldown ?? {},
  cluster: _userConfig.cluster ?? {},
});

export const userColors = appConfig.colors;

export const userEmojis = appConfig.emojis;

export default appConfig;
