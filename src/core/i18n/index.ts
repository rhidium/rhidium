import _i18n, { InterpolationMap, TOptions } from 'i18next';
import { Interaction, Locale } from 'discord.js';
import { UnitConstants } from '@core/constants';
import { LocalizedLabelKey, LocalizedReturnType } from './i18next';

import enUSCommon from '../../../locales/en-US/common.json';
import enUSCore from '../../../locales/en-US/core.json';
import nlCommon from '../../../locales/nl/common.json';
import nlCore from '../../../locales/nl/core.json';

export enum Locales {
  EnglishUS = Locale.EnglishUS,
  Dutch = Locale.Dutch,
}

export const ns = ['core', 'common', 'glossary', 'validation'] as const;
export const defaultNS = 'void';
export const resources = {
  [Locales.EnglishUS]: {
    core: enUSCore,
    common: enUSCommon,
    void: {}, // Empty namespace by default, prevents duplicate keys in Intellisense
  },
  [Locales.Dutch]: {
    core: nlCore,
    common: nlCommon,
  },
} as const;

class I18n {
  private static readonly instance = _i18n;

  public static readonly init = async (): Promise<typeof _i18n> => {
    await this.instance.init({
      debug: true,
      initAsync: false,
      ns,
      lng: Locales.EnglishUS,
      fallbackLng: Locales.EnglishUS,
      supportedLngs: [Locales.EnglishUS, Locales.Dutch],
      defaultNS,
      resources,
    });

    return this.instance;
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
    return `common:time.${amount === 1 ? 'singular' : 'plural'}.${unit}` as const;
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
    Key extends LocalizedLabelKey | LocalizedLabelKey[],
    Topt extends TOptions,
    Ret extends LocalizedReturnType<Key, Topt>,
  >(
    key: Key,
    interaction: Interaction,
    options?: Omit<Topt & InterpolationMap<Ret>, 'lng'>,
  ) => {
    return this.instance.t(key, {
      lng: interaction.locale,
      ...options,
    });
  };
}

export { I18n };
