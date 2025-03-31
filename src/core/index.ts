import moduleAlias from 'module-alias';
import { GatewayIntentBits } from 'discord.js';

moduleAlias.addAliases({
  '@core': `${__dirname}/`,
});

import { appConfig } from './config';
import { ClientManager } from './commands';
import TestChatInput, { TestJob } from '../modules/test/test';
import ProcessCommandUsageJob from '../modules/system/jobs/process-command-usage';
import Client from './client';
import ClientReady from '../modules/system/listeners/ready';
import { I18n } from './i18n';

const main = async () => {
  const manager = new ClientManager();
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    manager,
    Lang: await I18n.init(),
  });

  manager.register(TestChatInput, TestJob, ProcessCommandUsageJob, ClientReady);

  await client.login(appConfig.client.token, {
    guildId: appConfig.client.development_server_id,
    clearOtherEnvironment: true,
    forceSync: false,
  });
};

void main();
