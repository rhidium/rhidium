import { PopulatedGuild, Prompt, PromptType, PromptValue } from '@core';

type GuildSettingsKey = keyof PopulatedGuild;

type GuildSettingsPrompt<
  K extends GuildSettingsKey,
  T extends PromptType,
  R extends boolean = true,
  M extends boolean = false,
> = Prompt & {
  type: T;
  required: R;
  multiple: M;
  accessor: K;
  updater: (
    guild: PopulatedGuild,
    value: PromptValue<R, T, M>,
  ) => Promise<PopulatedGuild[K]>;
};

type GuildSettingsPromptMap<K extends GuildSettingsKey> = {
  [T in PromptType]:
    | GuildSettingsPrompt<K, T, true, true>
    | GuildSettingsPrompt<K, T, true, false>
    | GuildSettingsPrompt<K, T, false, true>
    | GuildSettingsPrompt<K, T, false, false>;
};

type GuildSettingsPrompts = {
  [K in GuildSettingsKey]: GuildSettingsPromptMap<K>[PromptType];
}[GuildSettingsKey][];

export {
  type GuildSettingsKey,
  type GuildSettingsPrompt,
  type GuildSettingsPromptMap,
  type GuildSettingsPrompts,
};
