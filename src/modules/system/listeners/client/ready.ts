import { Events } from 'discord.js';
import { Lang, ClientEventListener } from '@core';

export default new ClientEventListener({
  once: true,
  event: Events.ClientReady,
  async run(client) {
    // Log time since client initialization
    const timeSinceInit = client.logger.consoleExecutionTime(
      client.startInitializeTs,
    );
    client.logger.success(
      Lang.t('client:ready', {
        username: client.logger.consoleColors.cyan(client.user.username),
        duration: timeSinceInit,
      }),
    );

    // Always make sure commands are synced
    // This checks if anything has changed, and updates accordingly
    await client.commandManager.refreshCommandData();
  },
});
