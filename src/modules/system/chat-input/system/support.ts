import { Command, CommandThrottleType, CommandType } from '@core/commands';
import { appConfig, Embeds } from '@core/config';
import { UnitConstants } from '@core/constants';
import { I18n } from '@core/i18n';

const SupportCommand = new Command({
  type: CommandType.ChatInputPlain,
  data: (builder) =>
    builder.setName('support').setDescription('Receive support for the bot'),
  enabled: {
    global: !!appConfig.urls?.support_server,
  },
  throttle: {
    type: CommandThrottleType.Channel,
    limit: 1,
    duration: 30 * UnitConstants.MS_IN_ONE_SECOND,
  },
  run: async ({ interaction }) => {
    if (!appConfig.urls?.support_server) {
      await SupportCommand.reply(
        interaction,
        Embeds.error(
          I18n.localize('commands:support.noSupportServer', interaction),
        ),
      );
      return;
    }

    await SupportCommand.reply(
      interaction,
      Embeds.primary({
        description: I18n.localize('commands:support.prompt', interaction, {
          url: appConfig.urls.support_server,
        }),
      }),
    );
  },
});

export default SupportCommand;
