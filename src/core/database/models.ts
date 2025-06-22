import type {
  AuditLog,
  Command,
  Guild,
  Member,
  Reminder,
  User,
  Settings,
  WorkshopMod,
} from './client';

import type {
  PopulatedUser,
  PopulatedMember,
  PopulatedGuild,
  PopulatedAuditLog,
  PopulatedReminder,
  PopulatedCommand,
  PopulatedSettings,
  PopulatedWorkshopMod,
} from './select';

enum Model {
  User = 'User',
  Member = 'Member',
  Guild = 'Guild',
  AuditLog = 'AuditLog',
  Reminder = 'Reminder',
  Command = 'Command',
  Settings = 'Settings',
  WorkshopMod = 'WorkshopMod',
}

const seenModels = new Set<string>();
const modelEntries = Object.entries(Model);
const modelValues = modelEntries.map(([, value]) => value);
const modelChoices = modelEntries.map(([key, value]) => ({
  name: key,
  value,
}));

// Ensure lowercased models don't overlap,
// as we use the lc model name as subcmds
for (const model of modelValues) {
  const lowercased = model.toLowerCase();
  if (seenModels.has(lowercased)) {
    throw new Error(`Duplicate lowercased model detected: ${model}`);
  }
  seenModels.add(lowercased);
}

type ModelUnion =
  | User
  | Member
  | Guild
  | AuditLog
  | Reminder
  | Command
  | Settings
  | WorkshopMod;

type PopulatedModelUnion =
  | PopulatedUser
  | PopulatedMember
  | PopulatedGuild
  | PopulatedAuditLog
  | PopulatedReminder
  | PopulatedCommand
  | PopulatedSettings
  | PopulatedWorkshopMod;

type Models = {
  User: User;
  Member: Member;
  Guild: Guild;
  AuditLog: AuditLog;
  Reminder: Reminder;
  Command: Command;
  Settings: Settings;
  WorkshopMod: WorkshopMod;
};

export {
  Model,
  seenModels,
  modelEntries,
  modelValues,
  modelChoices,
  type ModelUnion,
  type PopulatedModelUnion,
  type Models,
};
