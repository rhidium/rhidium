import { defaultNS, Locales, resources, ns } from '.';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    ns: typeof ns;
    resources: (typeof resources)[Locales.EnglishUS];
  }
}
