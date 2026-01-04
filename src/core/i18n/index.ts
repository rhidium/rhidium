import { UnitConstants } from '@core/constants/units';
import { logger } from '@core/logger';
import { Guild, type Interaction, Locale } from 'discord.js';
import fs from 'fs';
import i18n, { type TOptions } from 'i18next';
import path from 'path';
import { fileURLToPath } from 'node:url';

import enUSCommon from '../../../locales/en-US/common.json';
import enUSCore from '../../../locales/en-US/core.json';

import nlCommon from '../../../locales/nl/common.json';
import nlCore from '../../../locales/nl/core.json';
import type { LocalizedLabelKey } from './types';

const Logger = logger();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * User-configurable locales directory.
 * If set, this directory takes precedence over the default rhidium locales.
 * Can be set via:
 * 1. setLocalesDirectory() function
 * 2. RHIDIUM_LOCALES_DIR environment variable
 */
let customLocalesDirectory: string | null = null;

/**
 * Set a custom locales directory for the consumer project.
 * Allows consumers to override or extend rhidium's localizations.
 * 
 * Can also be set via RHIDIUM_LOCALES_DIR environment variable.
 * 
 * @param directory - Absolute path to the locales directory
 * @example
 * ```ts
 * import { setLocalesDirectory } from 'rhidium';
 * setLocalesDirectory('/path/to/my/project/locales');
 * ```
 */
export const setLocalesDirectory = (directory: string | null): void => {
  if (directory && !fs.existsSync(directory)) {
    throw new Error(`Locales directory does not exist: ${directory}`);
  }
  customLocalesDirectory = directory;
};

/**
 * Gets the configured locales directory from env var or programmatic setting
 */
const getConfiguredLocalesDirectory = (): string | null => {
  // Priority: programmatically set > environment variable
  return customLocalesDirectory || process.env['RHIDIUM_LOCALES_DIR'] || null;
};

const getFiles = (
  dir: string,
  extensions: string[],
  recursive = false,
): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs
    .readdirSync(dir)
    .filter((file: string) => extensions.some((ext) => file.endsWith(ext)));

  if (recursive) {
    const subdirs = fs
      .readdirSync(dir)
      .filter((file: string) => fs.statSync(`${dir}/${file}`).isDirectory());
    for (const subdir of subdirs) {
      const subdirFiles = getFiles(`${dir}/${subdir}`, extensions, true);
      files.push(...subdirFiles);
    }
  }

  return files.map((file: string) => `${dir}/${file}`);
};

/**
 * Gets localized command files from multiple locations:
 * 1. Consumer's custom locales directory (if set via env var or function)
 * 2. Rhidium's bundled locales directory
 */
const getLocalizedCommands = () => {
  const customDir = getConfiguredLocalesDirectory();
  const locations = [
    // Consumer's custom locales directory
    ...(customDir ? [path.resolve(customDir, 'en-US/commands')] : []),
    // Rhidium's bundled locales
    path.resolve(__dirname, '../../../locales/en-US/commands'),
  ];

  const commandMap = new Map<string, string>();

  for (const location of locations) {
    const files = getFiles(location, ['.json']);
    for (const file of files) {
      const commandName = file.slice(
        file.lastIndexOf(path.sep) + 1,
        file.length - 5,
      );
      // Only add if not already found (consumer overrides rhidium)
      if (!commandMap.has(commandName)) {
        commandMap.set(commandName, file);
      }
    }
  }

  return Array.from(commandMap.entries());
};

const localizedCommands = getLocalizedCommands();

export enum Locales {
  EnglishUS = Locale.EnglishUS,
  Dutch = Locale.Dutch,
}

export const defaultLocale = Locales.EnglishUS;

export const locales = [defaultLocale, Locales.Dutch] as const;

const commandsLocalization = async (
  locale: Locales,
  isRequired = locale === defaultLocale,
) => {
  return Object.fromEntries(
    (await Promise.all(
      localizedCommands.map(async ([command, filePath]) => {
        let data;

        try {
          // Try to import the file directly (supports both ESM and JSON)
          data = await import(filePath);
        } catch (err) {
          if (isRequired) {
            throw err;
          }

          const resolvedPath = filePath.replace(
            /en-US/g,
            locale === Locales.EnglishUS ? 'en-US' : locale,
          );

          Logger.warn(
            `Missing command localization for ${command} in ${locale} at ${resolvedPath}`,
          );
        }

        return [command, data ?? null];
      }),
    )).filter(([, data]) => data !== null),
  );
};

export const ns = ['core', 'common', 'commands'] as const;

export const defaultNS = 'void';
export const resources = {
  [Locales.EnglishUS]: {
    core: enUSCore,
    common: enUSCommon,
    commands: commandsLocalization(Locales.EnglishUS),
    void: {}, // Empty namespace by default, prevents duplicate keys in Intellisense
  },
  [Locales.Dutch]: {
    core: nlCore,
    common: nlCommon,
    commands: commandsLocalization(Locales.Dutch),
  },
} as const;

class I18n {
  public static readonly init = async (): Promise<typeof i18n> => {
    await i18n.init({
      debug: true,
      initAsync: false,
      ns,
      lng: defaultLocale,
      fallbackLng: false,
      supportedLngs: locales,
      defaultNS,
      resources,
      interpolation: {
        escapeValue: false,
      },
    });

    return i18n;
  };

  public static readonly msToTime = (ms: number) => {
    const days = (ms / UnitConstants.MS_IN_ONE_DAY) | 0;
    const hours =
      ((ms % UnitConstants.MS_IN_ONE_DAY) / UnitConstants.MS_IN_ONE_HOUR) | 0;
    const minutes =
      ((ms % UnitConstants.MS_IN_ONE_HOUR) / UnitConstants.MS_IN_ONE_MINUTE) |
      0;
    const seconds =
      ((ms % UnitConstants.MS_IN_ONE_MINUTE) / UnitConstants.MS_IN_ONE_SECOND) |
      0;

    if (days > 0) {
      return [days, 'days'] as const;
    }
    if (hours > 0) {
      return [hours, 'hours'] as const;
    }
    if (minutes > 0) {
      return [minutes, 'minutes'] as const;
    }
    if (seconds > 0) {
      return [seconds, 'seconds'] as const;
    }

    return [1, 'seconds'] as const;
  };

  public static readonly timeKey = (ms: number) => {
    const [amount, unit] = I18n.msToTime(ms);
    return [
      amount,
      `common:time.${amount === 1 ? 'singular' : 'plural'}.${unit}`,
    ] as const;
  };

  public static readonly genericErrorDecline = (interaction: Interaction) => {
    return I18n.localize(
      [
        'core:commands.error',
        'common:errors.tryAgainLater',
        'common:errors.issueReportedToSupport',
      ],
      interaction,
    );
  };

  public static readonly localize = <
    Key extends LocalizedLabelKey | LocalizedLabelKey[] | `commands:${string}`,
  >(
    key: Key,
    ctx: Interaction | Guild | Locales | null,
    options?: Omit<TOptions, 'lng'>,
  ) => {
    return i18n.t(
      key as string,
      {
        ...options,
        lng: !ctx
          ? defaultLocale
          : typeof ctx === 'string'
            ? ctx
            : 'locale' in ctx
              ? ctx.locale
              : ctx.preferredLocale,
        fallbackLng: defaultLocale,
      } as unknown as string,
    ) as string;
  };

  public static readonly isLocalizedCommand = (command: string): boolean => {
    return localizedCommands.find(([file]) => file === command) !== undefined;
  };
}

export { I18n };
