import type {
  CommandCooldown,
  CommandStatistics,
  Guild,
  Member,
  User,
} from './client';

import type {
  PopulatedUser,
  PopulatedMember,
  PopulatedGuild,
  PopulatedCommandCooldown,
  PopulatedCommandStatistics,
} from './select';

enum Model {
  User = 'User',
  Member = 'Member',
  Guild = 'Guild',
  CommandCooldown = 'CommandCooldown',
  CommandStatistics = 'CommandStatistics',
}

const seenModels = new Set<string>();

// Ensure lowercased models don't overlap,
// as we use the lc model name as subcmds
for (const model of Object.values(Model)) {
  const lowercased = model.toLowerCase();
  if (seenModels.has(lowercased)) {
    throw new Error(`Duplicate lowercased model detected: ${model}`);
  }
  seenModels.add(lowercased);
}

type ModelUnion = User | Member | Guild | CommandCooldown | CommandStatistics;

type PopulatedModelUnion =
  | PopulatedUser
  | PopulatedMember
  | PopulatedGuild
  | PopulatedCommandCooldown
  | PopulatedCommandStatistics;

type Models = {
  User: User;
  Member: Member;
  Guild: Guild;
  CommandCooldown: CommandCooldown;
  CommandStatistics: CommandStatistics;
};

export { Model, type ModelUnion, type PopulatedModelUnion, type Models };
