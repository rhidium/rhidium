import { Lang } from 'lib/i18n';
import { UserContextCommand, ArrayUtils, TimeUtils } from '@rhidium/core';

const UserInfoCommand = new UserContextCommand({
  disabled: process.env.NODE_ENV === 'production',
  run: async (client, interaction) => {
    const { guild, targetUser } = interaction;

    if (!guild) {
      await UserInfoCommand.reply(interaction, {
        content: Lang.t('general:guildOnly'),
        ephemeral: true,
      });
      return;
    }

    await UserInfoCommand.deferReplyInternal(interaction);

    const target = await guild.members.fetch(targetUser.id);
    if (!target) {
      await UserInfoCommand.reply(interaction, {
        content: Lang.t('commands:user-info.noMember'),
        ephemeral: true,
      });
      return;
    }

    const unknown = Lang.t('general:unknown');
    const none = Lang.t('general:none');
    const maxRoles = 25;
    const roles = target.roles.cache
      .filter((role) => role.id !== guild.roles.everyone.id)
      .toJSON()
      .map((e) => e.toString());
    const joinedServer = target.joinedAt
      ? TimeUtils.discordInfoTimestamp(target.joinedAt.valueOf())
      : unknown;
    const joinedDiscord = TimeUtils.discordInfoTimestamp(
      targetUser.createdAt.valueOf(),
    );
    const roleOutput = ArrayUtils.joinWithLimit(roles, maxRoles, none);
    const hasServerAvatar =
      target.displayAvatarURL() !== null &&
      target.displayAvatarURL() !== targetUser.displayAvatarURL();
    const serverAvatarOutput = hasServerAvatar
      ? `[link](<${target.displayAvatarURL({ forceStatic: false, size: 4096 })}>)`
      : none;
    const boostingOutput =
      target.premiumSinceTimestamp !== null
        ? TimeUtils.discordInfoTimestamp(target.premiumSinceTimestamp)
        : Lang.t('commands:user-info.memberNotBoosting');

    const embed = client.embeds.branding({
      description: roleOutput,
      author: {
        name: target.user.username,
        iconURL: targetUser.displayAvatarURL({ forceStatic: false }),
      },
      fields: [
        {
          name: Lang.t('general:discord.nickname'),
          value: target.nickname ?? none,
          inline: true,
        },
        {
          name: Lang.t('general:discord.serverAvatar'),
          value: serverAvatarOutput,
        },
        {
          name: Lang.t('general:discord.boost'),
          value: boostingOutput,
          inline: false,
        },
        {
          name: Lang.t('general:discord.joinedServer'),
          value: joinedServer,
          inline: false,
        },
        {
          name: Lang.t('general:discord.joinedDiscord'),
          value: joinedDiscord,
          inline: false,
        },
      ],
    });

    if (hasServerAvatar)
      embed.setThumbnail(
        target.displayAvatarURL({ forceStatic: false, size: 1024 }),
      );

    await UserInfoCommand.reply(interaction, embed);
  },
});

export default UserInfoCommand;
