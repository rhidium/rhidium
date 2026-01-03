import { Model } from '../models';
import { type PopulatedReminder } from '../select';
import { DatabaseWrapper } from './wrapper';

type ResolvedPopulatedReminder = Omit<PopulatedReminder, 'repeatEvery'> & {
  repeatEvery: number | null;
};

class ReminderWrapper extends DatabaseWrapper<Model.Reminder> {
  constructor() {
    super(Model.Reminder);
  }

  readonly resolve = (
    reminder: PopulatedReminder,
  ): ResolvedPopulatedReminder => ({
    ...reminder,
    repeatEvery:
      reminder.repeatEvery === null ||
      reminder.repeatEvery > Number.MAX_SAFE_INTEGER
        ? null
        : Number(reminder.repeatEvery),
  });

  readonly forUser = (userId: string): Promise<ResolvedPopulatedReminder[]> =>
    this.findMany({ where: { UserId: userId } }).then((reminders) =>
      reminders.map(this.resolve),
    );

  readonly activeReminders = (
    now = new Date().toISOString(),
  ): Promise<ResolvedPopulatedReminder[]> =>
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
    }).then((reminders) => reminders.map(this.resolve));

  readonly createResolved = async (
    data: Parameters<typeof this.create>[0],
  ): Promise<ResolvedPopulatedReminder> => {
    const reminder = await this.create(data);
    return this.resolve(reminder);
  };

  readonly updateResolved = async (
    query: Parameters<typeof this.update>[0],
  ): Promise<ResolvedPopulatedReminder> => {
    const reminder = await this.update(query);
    return this.resolve(reminder);
  };

  readonly findFirstResolved = async (
    query: Parameters<typeof this.findFirst>[0],
    cacheResult?: boolean,
  ): Promise<ResolvedPopulatedReminder | null> => {
    const reminder = await this.findFirst(query, cacheResult);
    return reminder ? this.resolve(reminder) : null;
  };
}

const reminderWrapper = new ReminderWrapper();

export { reminderWrapper, type ResolvedPopulatedReminder };
