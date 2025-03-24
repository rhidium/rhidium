import { Events } from 'discord.js';
import { ClientEventListener } from '@core';
import { ReminderScheduler } from '../services/reminders/scheduler';

export default new ClientEventListener({
  once: true,
  event: Events.ClientReady,
  async run(client) {
    void ReminderScheduler.init(client);
  },
});
