import fs from 'fs';
import path from 'path';
import i18n, { TOptions } from 'i18next';
import { Guild, Interaction, Locale } from 'discord.js';
import { UnitConstants } from '@core/constants';
import { Logger } from '@core/logger';
import { LocalizedLabelKey } from './i18next';

import enUSCommon from '../../../locales/en-US/common.json';
import enUSCore from '../../../locales/en-US/core.json';

import nlCommon from '../../../locales/nl/common.json';
import nlCore from '../../../locales/nl/core.json';

const getFiles = (
  dir: string,
  extensions: string[],
  recursive = false,
): string[] => {
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

const localizedCommands = getFiles(
  path.resolve(__dirname, '../../../locales/en-US/commands'),
  ['.json'],
).map((file) => [path.basename(file, '.json'), path.resolve(file)] as const);

export enum Locales {
  EnglishUS = Locale.EnglishUS,
  Dutch = Locale.Dutch,
}

export const defaultLocale = Locales.EnglishUS;

export const locales = [defaultLocale, Locales.Dutch] as const;

const commandsLocalization = (
  locale: Locales,
  isRequired = locale === defaultLocale,
) => {
  return Object.fromEntries(
    localizedCommands
      .map(([command, path]) => {
        let data;

        try {
          data = require(path);
        } catch (err) {
          if (isRequired) {
            throw err;
          }

          Logger.warn(
            `Missing command localization for ${command} in ${locale}.json at ${path}`,
          );
        }

        return [command, data ?? null];
      })
      .filter(([, data]) => data !== null),
  );
};

export const ns = ['core', 'common', 'glossary', 'validation'] as const;

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
    // @ts-expect-error - Incompatible type signatures
    return i18n.t(key, {
      ...options,
      lng: !ctx
        ? defaultLocale
        : typeof ctx === 'string'
          ? ctx
          : 'locale' in ctx
            ? ctx.locale
            : ctx.preferredLocale,
      fallbackLng: defaultLocale,
    }) as string;
  };

  public static readonly isLocalizedCommand = (command: string): boolean => {
    return localizedCommands.find(([file]) => file === command) !== undefined;
  };
}

export { I18n };
