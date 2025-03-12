import { defaultNS } from './i18n';
import Resources from './i18next-resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: Resources;
  }
}
