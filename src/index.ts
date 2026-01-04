
import { GatewayIntentBits } from 'discord.js';

import { initializeLogger } from '@core/logger';
import { appConfig, setConfigDirectory } from './core/config/app';
import { ClientManager } from './core/commands/manager';
import { commandDeploymentEnvironment } from '@core/commands/defaults';
import Client from './core/client';
import { I18n } from './core/i18n';

import utilityRegistry from './modules/utility';
import systemRegistry from './modules/system';
import moderationRegistry from './modules/moderation';

const main = async () => {
  setConfigDirectory(process.env['RHIDIUM_CONFIG_DIR'] || './config');
  initializeLogger(appConfig.logging);

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
      clearOtherEnvironment: process.env['NODE_ENV'] !== 'production',
      forceSync: false,
    }),
  ]);
};

void main();
