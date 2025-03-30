import { auditLogWrapper } from './audit-log';
import { commandWrapper } from './command';
import { guildWrapper } from './guild';
import { memberWrapper } from './member';
import { reminderWrapper } from './reminder';
import { userWrapper } from './user';

export {
  type CacheType,
  type CacheManagerType,
  type ModelOperation,
  modelOperations,
} from './wrapper';

export { AuditLogType, type AuditLogOptions } from './audit-log';
export { type ResolvedPopulatedReminder } from './reminder';

export class Database {
  private static _instance: Database;

  private constructor() {}

  static get instance() {
    if (!Database._instance) {
      Database._instance = new Database();
    }

    return Database._instance;
  }

  static readonly Command = commandWrapper;
  static readonly Guild = guildWrapper;
  static readonly Member = memberWrapper;
  static readonly User = userWrapper;
  static readonly AuditLog = auditLogWrapper;
  static readonly Reminder = reminderWrapper;
}
