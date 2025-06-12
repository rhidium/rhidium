import {
  Command,
  CommandThrottleType,
  CommandType,
  PermLevel,
} from '@core/commands';
import { appConfig, Embeds } from '@core/config';
import { UnitConstants } from '@core/constants';

const ChangeAvatarCommand = new Command({
  type: CommandType.ChatInputPlain,
  permissions: {
    level: PermLevel['Bot Administrator'],
  },
  enabled: {
    guilds: appConfig.client.development_server_id
      ? [appConfig.client.development_server_id]
      : false,
  },
  throttle: {
    // Global Rate Limit of 5 per hour
    enabled: true,
    type: CommandThrottleType.Global,
    limit: 5,
    duration: UnitConstants.MS_IN_ONE_HOUR,
  },
  data: (builder) =>
    builder
      .setName('change-avatar')
      .setDescription("Change the bot's avatar")
      .setDefaultMemberPermissions(0)
      .addAttachmentOption((option) =>
        option
          .setName('avatar')
          .setDescription('The avatar to set')
          .setRequired(true),
      ),
  run: async ({ client, interaction }) => {
    const { options } = interaction;
    const avatarAttachment = options.getAttachment('avatar', true);

    if (!avatarAttachment.contentType?.startsWith('/image')) {
      await ChangeAvatarCommand.reply(
        interaction,
        Embeds.error('The provided attachment is not an image'),
      );
      return;
    }

    try {
      await client.user.setAvatar(avatarAttachment.url);
    } catch (err) {
      await ChangeAvatarCommand.reply(
        interaction,
        Embeds.error(
          `Failed to set avatar: ${err instanceof Error ? err.message : err}`,
        ),
      );
      return;
    }

    await ChangeAvatarCommand.reply(
      interaction,
      Embeds.success({
        description: 'Successfully set avatar',
        thumbnail: { url: avatarAttachment.url },
      }),
    );
  },
});

export default ChangeAvatarCommand;
