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

// [DEV] IDs for debugging

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
