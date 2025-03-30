import { ClientEventListener } from '@client/commands';
import { appConfig } from '@client/config';
import { Logger } from '@client/logger';
import { Events } from 'discord.js';

const ClientReady = new ClientEventListener({
  event: Events.ClientReady,
  run: async (client) => {
    Logger.info(`Client ready and logged in as ${client.user.username}`);

    void client.manager.initialize(client).syncCommands(
      appConfig.client.development_server_id,
      true,
      // process.env.NODE_ENV !== 'production',
    );

    console.log(client.Lang.t(''));
  },
});

export default ClientReady;
