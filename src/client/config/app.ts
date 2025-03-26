import { Colors, HexColorString, resolveColor } from 'discord.js';

// eslint-disable-next-line n/no-unpublished-import
import config from '../../../config/config.json';
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
        : process.env.NODE_ENV === 'development'
          ? (process.env.DEVELOPMENT_SERVER_ID ?? null)
          : null,
  },
  colors: {
    primary: colorResolver(config.colors.primary, Colors.Blurple),
    secondary: colorResolver(config.colors.secondary, Colors.Grey),
    success: colorResolver(config.colors.success, Colors.Green),
    warning: colorResolver(config.colors.warning, Colors.Orange),
    error: colorResolver(config.colors.error, Colors.Red),
    debug: colorResolver(config.colors.debug, Colors.Purple),
    info: colorResolver(config.colors.info, Colors.Blue),
    waiting: colorResolver(config.colors.waiting, Colors.Yellow),
  },
  pkg,
};
