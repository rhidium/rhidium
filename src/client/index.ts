import moduleAlias from 'module-alias';
import { GatewayIntentBits } from 'discord.js';

moduleAlias.addAliases({
  '@client': `${__dirname}/`,
});

import { appConfig } from './config';
import { CommandManager } from './commands';
import TestChatInput, { TestJob } from '../modules/test/test';
import ProcessCommandUsageJob from '../modules/system/jobs/process-command-usage';
import Client from './client';
import ClientReady from '../modules/system/listeners/ready';
import { I18n } from './i18n';

const main = async () => {
  const manager = new CommandManager();
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    manager,
    Lang: await I18n.init(),
  });

  manager.register(TestChatInput);
  manager.addJobs(TestJob, ProcessCommandUsageJob);
  manager.addListeners(ClientReady);

  await client.login(appConfig.client.token);
};

void main();
