import { Locale } from 'discord.js';
import _Lang from 'i18next';

import enClient from '../../../locales/en-US/client.json';
import enCommands from '../../../locales/en-US/commands.json';
import enGeneral from '../../../locales/en-US/general.json';
import libEnglish from '../../../locales/en-US/lib.json';

import nlClient from '../../../locales/nl/client.json';
import nlCommands from '../../../locales/nl/commands.json';
import nlGeneral from '../../../locales/nl/general.json';
import libDutch from '../../../locales/nl/lib.json';

export const defaultNS = 'client';
export const defaultLanguage = Locale.EnglishUS;

export const init = (debugEnabled = false) =>
  _Lang.init({
    debug: debugEnabled,
    fallbackLng: defaultLanguage,
    defaultNS,
    resources: {
      [Locale.EnglishUS]: {
        client: enClient,
        commands: enCommands,
        general: enGeneral,
        lib: libEnglish,
      },
      [Locale.Dutch]: {
        client: nlClient,
        commands: nlCommands,
        general: nlGeneral,
        lib: libDutch,
      },
    },
  });

export const Lang = _Lang;

export default Lang;
