import i18n from 'i18next';
import { Locale } from 'discord.js';

import enUSCommon from '../../../locales/en-US/common.json';
import enUSCore from '../../../locales/en-US/core.json';
import enUSGlossary from '../../../locales/en-US/glossary.json';
import enUSValidation from '../../../locales/en-US/validation.json';

export enum Locales {
  EnglishUS = Locale.EnglishUS,
  Dutch = Locale.Dutch,
}

export const defaultNS = 'void';
export const resources = {
  [Locales.EnglishUS]: {
    core: enUSCore,
    common: enUSCommon,
    glossary: enUSGlossary,
    validation: enUSValidation,
    void: {}, // Empty namespace by default, prevents duplicate keys in Intellisense
  },
  [Locales.Dutch]: {
    // [DEV] Add Dutch translations after refactor is finished
    core: enUSCore,
    common: enUSCommon,
    glossary: enUSGlossary,
    validation: enUSValidation,
  },
} as const;

class I18n {
  public static readonly init = async (): Promise<typeof i18n> => {
    await i18n.init({
      debug: true,
      initAsync: false,
      ns: ['core', 'common', 'glossary', 'validation'],
      lng: Locales.EnglishUS,
      fallbackLng: Locales.EnglishUS,
      supportedLngs: [Locales.EnglishUS, Locales.Dutch],
      defaultNS,
      resources,
    });

    return i18n;
  };
}

export { I18n };
