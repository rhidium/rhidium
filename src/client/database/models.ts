import type {
  AuditLog,
  Command,
  CommandCooldown,
  CommandStatistics,
  Guild,
  Member,
  Reminder,
  User,
} from './client';

import type {
  PopulatedUser,
  PopulatedMember,
  PopulatedGuild,
  PopulatedCommandCooldown,
  PopulatedCommandStatistics,
  PopulatedAuditLog,
  PopulatedReminder,
  PopulatedCommand,
} from './select';

enum Model {
  User = 'User',
  Member = 'Member',
  Guild = 'Guild',
  CommandCooldown = 'CommandCooldown',
  CommandStatistics = 'CommandStatistics',
  AuditLog = 'AuditLog',
  Reminder = 'Reminder',
  Command = 'Command',
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
  | CommandCooldown
  | CommandStatistics
  | AuditLog
  | Reminder
  | Command;

type PopulatedModelUnion =
  | PopulatedUser
  | PopulatedMember
  | PopulatedGuild
  | PopulatedCommandCooldown
  | PopulatedCommandStatistics
  | PopulatedAuditLog
  | PopulatedReminder
  | PopulatedCommand;

type Models = {
  User: User;
  Member: Member;
  Guild: Guild;
  CommandCooldown: CommandCooldown;
  CommandStatistics: CommandStatistics;
  AuditLog: AuditLog;
  Reminder: Reminder;
  Command: Command;
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
