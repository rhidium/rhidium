import { MappedPrompt, PopulatedGuild, PromptType } from '@core';

const permissionSettings: (keyof Pick<
  PopulatedGuild,
  'adminRoleIds' | 'adminUserIds' | 'modRoleIds'
>)[] = ['adminRoleIds', 'adminUserIds', 'modRoleIds'] as const;

type PermissionSetting = (typeof permissionSettings)[number];

type SettingsKey = Exclude<
  keyof PopulatedGuild,
  | 'SeverityConfiguration'
  | 'AutoModerationActions'
  | 'MemberJoinEmbed'
  | 'MemberLeaveEmbed'
>;

type SettingsPrompt<
  K extends SettingsKey,
  T extends PromptType,
  R extends boolean,
  M extends boolean,
> = MappedPrompt<T, R, M> & {
  accessor: K;
  displayInline?: boolean;
  displayCategory?: string;
  infoSuffix?: string;
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
  permissionSettings,
  type PermissionSetting,
  type SettingsKey,
  type SettingsPrompt,
  type SettingsPromptMap,
  type SettingsPrompts,
};
