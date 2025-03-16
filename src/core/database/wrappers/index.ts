import { commandCooldownWrapper } from './command-cooldown';
import { commandStatisticsWrapper } from './command-statistics';
import { guildWrapper } from './guild';
import { memberWrapper } from './member';
import { userWrapper } from './user';

export class Database {
  private static _instance: Database;

  private constructor() {}

  static get instance() {
    if (!Database._instance) {
      Database._instance = new Database();
    }

    return Database._instance;
  }

  static readonly CommandCooldown = commandCooldownWrapper;
  static readonly CommandStatistics = commandStatisticsWrapper;
  static readonly Guild = guildWrapper;
  static readonly Member = memberWrapper;
  static readonly User = userWrapper;
}
