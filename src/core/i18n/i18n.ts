import i18n from 'i18next';
import { Locale } from 'discord.js';

import enClient from '../../../locales/en-US/client.json';
import enCommands from '../../../locales/en-US/commands.json';
import enGeneral from '../../../locales/en-US/general.json';
import libEnglish from '../../../locales/en-US/core.json';

import nlClient from '../../../locales/nl/client.json';
import nlCommands from '../../../locales/nl/commands.json';
import nlGeneral from '../../../locales/nl/general.json';
import libDutch from '../../../locales/nl/core.json';

export const defaultNS = 'client';
export const defaultLanguage = Locale.EnglishUS;
export const resources = {
  [Locale.EnglishUS]: {
    client: enClient,
    commands: enCommands,
    general: enGeneral,
    core: libEnglish,
  },
  [Locale.Dutch]: {
    client: nlClient,
    commands: nlCommands,
    general: nlGeneral,
    core: libDutch,
  },
} as const;

export const init = (debugEnabled = false) =>
  i18n.init({
    debug: debugEnabled,
    fallbackLng: defaultLanguage,
    lng: defaultLanguage,
    defaultNS,
    resources,
  });

export const Lang = i18n;

export default Lang;
