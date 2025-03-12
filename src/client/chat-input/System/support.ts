import { SlashCommandBuilder } from 'discord.js';
import {
  Lang,
  ChatInputCommand,
  CommandCooldownType,
  UnitConstants,
  appConfig,
} from '@core';

const SupportCommand = new ChatInputCommand({
  data: new SlashCommandBuilder().setDescription('Receive support for the bot'),
  cooldown: {
    type: CommandCooldownType.Channel,
    usages: 1,
    duration: 30 * UnitConstants.MS_IN_ONE_SECOND,
  },
  run: async (client, interaction) => {
    if (!appConfig.urls?.support_server) {
      await SupportCommand.reply(
        interaction,
        client.embeds.error(Lang.t('commands:support.noSupportServer')),
      );
      return;
    }

    await SupportCommand.reply(
      interaction,
      client.embeds.branding({
        description: Lang.t('commands:support.prompt', {
          link: appConfig.urls.support_server,
        }),
      }),
    );
  },
});

export default SupportCommand;
