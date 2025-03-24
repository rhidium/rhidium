import _debug from 'debug';
import {
  Client,
  Database,
  NumberUtils,
  ResolvedPopulatedReminder,
  TimeUtils,
} from '@core';
import { ReminderServices } from '.';

const defaultLogger = _debug('@repo/reminders:scheduler');

class ReminderScheduler {
  constructor(
    private readonly cache = new Map<
      number,
      ResolvedPopulatedReminder & {
        timeout: NodeJS.Timeout;
      }
    >(),
    private readonly logger = defaultLogger,
  ) {}

  readonly init = async (client: Client) => {
    const reminders = await Database.Reminder.activeReminders();

    for (const reminder of reminders) {
      void this.scheduleReminder(client, reminder);
    }
  };

  readonly cancelReminder = (reminderId: number) => {
    const reminder = this.cache.get(reminderId);

    if (!reminder) {
      this.logger(
        `Reminder not found when trying to cancel: ${reminderId} - ignoring`,
      );
      return;
    }

    clearTimeout(reminder.timeout);
    this.cache.delete(reminderId);
  };

  async scheduleReminder(client: Client, reminder: ResolvedPopulatedReminder) {
    const now = Date.now();
    const reminderDate = ReminderServices.currentReminderDate(reminder);
    const diff = reminderDate.getTime() - now;

    if (diff > Number.MAX_SAFE_INTEGER) {
      this.logger(
        `Reminder is too far in the future: ${reminder.id}, deleting...`,
        JSON.stringify(reminder, null, 2),
      );

      this.cancelReminder(reminder.id);
      await Database.Reminder.delete({ id: reminder.id });
    }

    if (diff < 0) {
      this.logger(
        `Reminder is in the past: ${reminder.id}, deleting...`,
        JSON.stringify(reminder, null, 2),
      );

      this.cancelReminder(reminder.id);
      await Database.Reminder.delete({ id: reminder.id });

      return;
    }

    this.logger(
      `Scheduling reminder: ${reminder.id} in ${TimeUtils.humanReadableMs(diff)} (at ${reminderDate.toISOString()})`,
    );

    const runFn = async () => {
      this.logger(
        `Reminder triggered: ${reminder.id}`,
        JSON.stringify(reminder, null, 2),
      );

      const embed = ReminderServices.createReminderEmbed(client, reminder);

      if (reminder.shouldDM) {
        const user = await client.users
          .fetch(reminder.UserId, {
            cache: true,
            force: false,
          })
          .catch(() => null);

        if (user) {
          await user.send({ embeds: [embed] }).catch((err) => {
            this.logger(
              `Failed to send DM to user "${reminder.UserId}" for reminder "${reminder.id}": ${
                err.message
              }`,
            );
          });
        }
      } else if (reminder.channelId && reminder.GuildId) {
        const guild = client.guilds.cache.get(reminder.GuildId);

        if (!guild) {
          this.logger(
            `Guild not found for reminder "${reminder.id}": ${reminder.GuildId}`,
          );
          return;
        }

        const channel = guild.channels.cache.get(reminder.channelId);

        if (!channel) {
          this.logger(
            `Channel not found for reminder "${reminder.id}": ${reminder.channelId}`,
          );
          return;
        }

        if (!channel.isTextBased()) {
          this.logger(
            `Channel is not text-based for reminder "${reminder.id}": ${reminder.channelId}`,
          );
          return;
        }

        if (channel.isDMBased()) {
          this.logger(
            `Channel is DM-based for reminder "${reminder.id}": ${reminder.channelId}`,
          );
          return;
        }

        await channel
          .send({ content: `<@${reminder.UserId}>`, embeds: [embed] })
          .catch((err) => {
            this.logger(
              `Failed to send message to channel "${reminder.channelId}" for reminder "${reminder.id}": ${
                err.message
              }`,
            );
          });
      }

      this.cancelReminder(reminder.id);

      if (reminder.repeatEvery) {
        const newDate = new Date(
          reminder.remindAt.getTime() + reminder.repeatEvery,
        );

        if (
          reminder.repeatUntil &&
          newDate.valueOf() > reminder.repeatUntil.valueOf()
        ) {
          this.logger(
            `Reminder has reached repeatUntil: ${reminder.id}, deleting...`,
          );

          await Database.Reminder.delete({ id: reminder.id });

          return;
        }

        await Database.Reminder.updateResolved({
          where: {
            id: reminder.id,
          },
          data: {
            remindAt: newDate,
          },
        }).then((updated) => this.scheduleReminder(client, updated));
      } else {
        await Database.Reminder.delete({ id: reminder.id });
      }
    };

    if (reminder.remindAt.valueOf() < now) {
      this.logger(
        `Reminder is in the past: ${reminder.id}, running immediately...`,
      );

      await runFn();
      return;
    }

    if (diff > NumberUtils.INT32_MAX) {
      this.logger(
        `Reminder is too far in the future: ${reminder.id}, checking again after ${TimeUtils.humanReadableMs(
          NumberUtils.INT32_MAX,
        )}`,
      );

      this.cancelReminder(reminder.id);

      setTimeout(async () => {
        const currentReminder = await Database.Reminder.findFirstResolved({
          where: {
            id: reminder.id,
          },
        });

        if (!currentReminder) {
          this.logger(`Reminder not found after timeout: ${reminder.id}`);
          return;
        }

        this.logger(`Rescheduling reminder after timeout: ${reminder.id}`);
        await this.scheduleReminder(client, currentReminder);
      }, NumberUtils.INT32_MAX);

      return;
    }

    const timeout = setTimeout(async () => {
      try {
        await runFn();
      } catch (err) {
        this.logger(`Failed to run reminder: ${reminder.id}`, err);

        const currentReminder = await Database.Reminder.findFirstResolved({
          where: {
            id: reminder.id,
          },
        });

        if (currentReminder) {
          this.logger(`Rescheduling reminder due to failure: ${reminder.id}`);
          await this.scheduleReminder(client, currentReminder);
        }
      }
    }, diff);

    this.cache.set(reminder.id, { ...reminder, timeout });
  }
}

const reminderScheduler = new ReminderScheduler();

export { reminderScheduler as ReminderScheduler };
