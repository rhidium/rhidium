import { defaultNS, Locales, resources } from '.';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)[Locales.EnglishUS];
  }
}
