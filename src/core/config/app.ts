/* eslint-disable n/no-unpublished-import */
import { Colors, type HexColorString, resolveColor } from 'discord.js';

import config from '../../../config/config.json';
import extendedConfig from '../../../config/extended-config.json';
import pkg from '../../../package.json';

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