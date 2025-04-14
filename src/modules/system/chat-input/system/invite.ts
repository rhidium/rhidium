import { Command, CommandThrottleType, CommandType } from '@core/commands';
import { appConfig, Embeds } from '@core/config';
import { UnitConstants } from '@core/constants';
import { I18n } from '@core/i18n';

const InviteCommand = new Command({
  type: CommandType.ChatInputPlain,
  data: (builder) =>
    builder
      .setName('invite')
      .setDescription('Get a link to invite the bot to your server'),
  throttle: {
    type: CommandThrottleType.Channel,
    limit: 1,
    duration: 30 * UnitConstants.MS_IN_ONE_SECOND,
  },
  run: async ({ client, interaction }) => {
    await InviteCommand.reply(
      interaction,
      Embeds.primary({
        description: I18n.localize('commands:invite.prompt', interaction, {
          link: client.manager.generateInvite(
            client,
            appConfig.client.development_server_id ?? undefined,
          ),
        }),
      }),
    );
  },
});

export default InviteCommand;
