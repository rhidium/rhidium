import { GatewayIntentBits } from 'discord.js';

import { appConfig } from './core/config/index';
import { ClientManager, commandDeploymentEnvironment } from './core/commands';
import Client from './core/client';
import { I18n } from './core/i18n';

import utilityRegistry from './modules/utility';
import systemRegistry from './modules/system';
import moderationRegistry from './modules/moderation';

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
      guildId: commandDeploymentEnvironment,
      clearOtherEnvironment: process.env.NODE_ENV !== 'production',
      forceSync: false,
    }),
  ]);
};

void main();
