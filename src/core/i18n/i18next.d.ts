import { type ParseKeys } from 'i18next';
import { defaultNS, Locales, resources, ns } from '.';

type LocalizedLabelKey = ParseKeys<typeof ns>;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    ns: typeof ns;
    resources: (typeof resources)[Locales.EnglishUS];
  }
}
