import { SlashCommandBuilder } from 'discord.js';
import {
  ChatInputCommand,
  CommandCooldownType,
  PermLevel,
  UnitConstants,
} from '@core';

const ChangeAvatarCommand = new ChatInputCommand({
  permLevel: PermLevel['Bot Administrator'],
  cooldown: {
    // Global Rate Limit of 5 per hour
    type: CommandCooldownType.Global,
    usages: 5,
    duration: UnitConstants.MS_IN_ONE_HOUR,
    persistent: true,
  },
  data: new SlashCommandBuilder()
    .setDescription("Change the bot's avatar")
    .addAttachmentOption((option) =>
      option
        .setName('avatar')
        .setDescription('The avatar to set')
        .setRequired(true),
    ),
  run: async (client, interaction) => {
    const { options } = interaction;
    const avatarAttachment = options.getAttachment('avatar', true);

    if (!avatarAttachment.contentType?.startsWith('/image')) {
      await ChangeAvatarCommand.reply(
        interaction,
        client.embeds.error('The provided attachment is not an image'),
      );
      return;
    }

    try {
      await client.user.setAvatar(avatarAttachment.url);
    } catch (err) {
      await ChangeAvatarCommand.reply(
        interaction,
        client.embeds.error(
          `Failed to set avatar: ${err instanceof Error ? err.message : err}`,
        ),
      );
      return;
    }

    await ChangeAvatarCommand.reply(
      interaction,
      client.embeds.success({
        description: 'Successfully set avatar',
        thumbnail: { url: avatarAttachment.url },
      }),
    );
  },
});

export default ChangeAvatarCommand;
