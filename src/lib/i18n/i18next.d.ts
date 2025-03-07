import Resources from './i18next-resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: Resources;
  }
}
