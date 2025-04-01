import { Events } from 'discord.js';
import { ReminderScheduler } from '../services/reminders/scheduler';
import { ClientEventListener } from '@core/commands';

const ClientReady = new ClientEventListener({
  once: true,
  event: Events.ClientReady,
  async run(client) {
    void ReminderScheduler.init(client);
  },
});

export default ClientReady;
