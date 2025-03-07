import { i18n } from 'i18next';
import { Locale } from 'discord.js';

import _enUS from '../../../locales/en-US.json';
import _nl from '../../../locales/nl.json';

export const enUS = _enUS;
export const nl = _nl;

export type ResourceBundle = {
  lng: Locale;
  resources: typeof enUS;
};

export const defaultResourceBundles = [
  {
    lng: Locale.EnglishUS,
    resources: enUS,
  },
  {
    lng: Locale.Dutch,
    resources: nl,
  },
];

export const defaultNS = 'lib';

export const initializeLocalization = (
  clientLang: i18n,
  resourceBundles: ResourceBundle[],
) => {
  if (resourceBundles.length) {
    resourceBundles.forEach((bundle) => {
      clientLang.addResourceBundle(
        bundle.lng,
        defaultNS,
        bundle.resources,
        true,
        true,
      );
    });
  }
};
