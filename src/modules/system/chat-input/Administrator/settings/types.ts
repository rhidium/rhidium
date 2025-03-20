import { MappedPrompt, PopulatedGuild, PromptType } from '@core';

type SettingsKey = keyof PopulatedGuild;

type SettingsPrompt<
  K extends SettingsKey,
  T extends PromptType,
  R extends boolean,
  M extends boolean,
> = MappedPrompt<T, R, M, false> & {
  accessor: K;
};

type SettingsPromptMap<K extends SettingsKey> = {
  [T in PromptType]:
    | SettingsPrompt<K, T, true, true>
    | SettingsPrompt<K, T, true, false>
    | SettingsPrompt<K, T, false, true>
    | SettingsPrompt<K, T, false, false>;
};

type SettingsPrompts = {
  [K in SettingsKey]: SettingsPromptMap<K>[PromptType];
}[SettingsKey][];

export {
  type SettingsKey,
  type SettingsPrompt,
  type SettingsPromptMap,
  type SettingsPrompts,
};
