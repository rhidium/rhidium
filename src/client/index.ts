import moduleAlias from 'module-alias';
import { Client, Events, GatewayIntentBits } from 'discord.js';

moduleAlias.addAliases({
  '@client': `${__dirname}/`,
});

import { appConfig } from './config';
import { CommandManager } from './commands';
import TestChatInput from '../modules/test/test';
import { Logger } from './logger';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});
const manager = new CommandManager();

manager.register(TestChatInput);

const main = async () => {
  await client.login(appConfig.client.token);

  client.once(Events.ClientReady, (c) => {
    Logger.info(`Client ready and logged in as ${c.user.username}`);

    manager.initialize(c);
    void manager.syncCommands(c, appConfig.client.development_server_id);
  });
};

void main();
