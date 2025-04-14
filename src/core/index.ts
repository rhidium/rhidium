import moduleAlias from 'module-alias';
import { GatewayIntentBits } from 'discord.js';

moduleAlias.addAliases({
  '@core': `${__dirname}/`,
});

import { appConfig } from './config';
import { ClientManager } from './commands';
import Client from './client';
import { I18n } from './i18n';
import utilityRegistry from '../modules/utility';
import systemRegistry from '../modules/system';
import moderationRegistry from '../modules/moderation';

const main = async () => {
  await I18n.init();
  const manager = new ClientManager();
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    manager,
  });

  manager.register(
    ...systemRegistry,
    ...utilityRegistry,
    ...moderationRegistry,
  );

  await Promise.all([
    client.login(appConfig.client.token, {
      guildId: appConfig.client.development_server_id,
      clearOtherEnvironment: true,
      forceSync: false,
    }),
  ]);
};

void main();
