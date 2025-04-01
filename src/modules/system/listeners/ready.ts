import { ClientEventListener } from '@core/commands';
import { Logger } from '@core/logger';
import { Events } from 'discord.js';
import { backlogCommandUsage } from '../jobs/process-command-usage';

const ClientReady = new ClientEventListener({
  once: true,
  event: Events.ClientReady,
  run: async (client) => {
    Logger.info(`Client ready and logged in as ${client.user.username}`);
    await backlogCommandUsage();

    console.dir(
      client.manager.apiCommands.map((command) => command.data.toJSON()),
      { depth: null },
    );
  },
});

export default ClientReady;
