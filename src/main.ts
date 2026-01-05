
import { GatewayIntentBits } from 'discord.js';

import { initializeLogger } from '@core/logger';
import { appConfig, setConfigDirectory, setPackageJsonPath } from './core/config/app';
import { ClientManager, type ComponentRegistry } from './core/commands/manager';
import { commandDeploymentEnvironment } from '@core/commands/defaults';
import Client, { type ClientOptions } from './core/client';
import { I18n, setLocalesDirectory } from './core/i18n';

import utilityRegistry from './modules/utility';
import systemRegistry from './modules/system';
import moderationRegistry from './modules/moderation';

type Options = {
  /**
   * Components to register with the client manager
   * 
   * - If not provided, defaults to registering all components from
   *   system, utility, and moderation registries.
   */
  components?: ComponentRegistry;
  /**
   * Additional client options to pass when creating the Discord client
   * 
   * - Merges with default options like intents and manager
   */
  clientOptions?: ClientOptions;
  /**
   * Options for logging in the client
   */
  logInOptions?: Partial<Parameters<Client['login']>[1]>;
};

const main = async (
  {
    components,
    clientOptions = {
      intents: [GatewayIntentBits.Guilds],
      manager: new ClientManager(),
    },
    logInOptions = {},
  }: Options = {},
) => {
  setConfigDirectory(process.env['RHIDIUM_CONFIG_DIR'] || './config');
  setPackageJsonPath(process.env['RHIDIUM_PACKAGE_JSON'] || null);
  setLocalesDirectory(process.env['RHIDIUM_LOCALES_DIR'] || null);
  initializeLogger(appConfig.logging);

  await I18n.init();

  const manager = clientOptions.manager;
  const client = new Client(clientOptions);

  if (components && components.length > 0) {
    manager.register(...components);
  } else {
    manager.register(
      ...systemRegistry,
      ...utilityRegistry,
      ...moderationRegistry,
    );
  }

  await Promise.all([
    client.login(appConfig.client.token, {
      guildId: commandDeploymentEnvironment,
      clearOtherEnvironment: process.env['NODE_ENV'] !== 'production',
      forceSync: false,
      ...logInOptions,
    }),
  ]);
};

export {
  main,
}
