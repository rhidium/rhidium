import { AppendKeyPrefix, ParseKeys, TFunctionReturn, TOptions } from 'i18next';
import { defaultNS, Locales, resources, ns } from '.';

type LocalizedLabelKey = ParseKeys<typeof ns, {}, typeof defaultNS>;
// | TemplateStringsArray;

type LocalizedReturnType<
  Key extends LocalizedLabelKey | LocalizedLabelKey[],
  TOpt extends TOptions,
> = TFunctionReturn<typeof defaultNS, AppendKeyPrefix<Key, undefined>, TOpt>;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    ns: typeof ns;
    resources: (typeof resources)[Locales.EnglishUS];
  }
}
