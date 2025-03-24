import { Model } from '../models';
import { DatabaseWrapper } from './wrapper';

class ReminderWrapper extends DatabaseWrapper<Model.Reminder> {
  constructor() {
    super(Model.Reminder);
  }

  readonly forUser = (userId: string) =>
    this.findMany({ where: { UserId: userId } });

  readonly activeReminders = (now = new Date().toISOString()) =>
    this.findMany({
      where: {
        OR: [
          { remindAt: { gte: now } },
          {
            OR: [
              { repeatEvery: { not: null } },
              {
                AND: [{ repeatUntil: { gte: now } }, { repeatUntil: null }],
              },
            ],
          },
        ],
      },
    });
}

const reminderWrapper = new ReminderWrapper();

export { reminderWrapper };
