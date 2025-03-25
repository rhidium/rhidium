import {
  UserContextCommand,
  ArrayUtils,
  TimeUtils,
  Lang,
  Database,
  PermLevel,
  StringUtils,
  EmbedConstants,
} from '@core';
import { ContextMenuCommandBuilder } from 'discord.js';
import { WarnServices } from '../services/warn';
import { stripIndents } from 'common-tags';

const UserInfoCommand = new UserContextCommand({
  data: new ContextMenuCommandBuilder().setName('Display User Info'),
  guildOnly: true, // Note: User Ctx Menus currently not supported through User Install
  disabled: false,
  category: 'Moderation',
  permLevel: PermLevel.Moderator,
  isEphemeral: true,
  run: async (client, interaction) => {
    const { guild, targetUser } = interaction;

    if (!guild) {
      await UserInfoCommand.reply(
        interaction,
        client.embeds.error('This command can only be used in a server.'),
      );
      return;
    }

    await UserInfoCommand.deferReplyInternal(interaction);

    const target = await guild.members.fetch(targetUser.id);
    if (!target) {
      await UserInfoCommand.reply(
        interaction,
        client.embeds.error(
          `Unable to resolve member for ${targetUser}, please try again.`,
        ),
      );
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
    const roleOutput = ArrayUtils.join(roles, {
      maxItems: maxRoles,
      emptyOutput: none,
    });
    const hasServerAvatar =
      target.displayAvatarURL() !== null &&
      target.displayAvatarURL() !== targetUser.displayAvatarURL();

    const [dbMember, dbGuild] = await Database.Member.resolve(
      {
        userId: target.id,
        guildId: guild.id,
      },
      true,
    );

    const resolvedWarns = WarnServices.resolveWarns(dbMember, dbGuild);
    const receivedWarningsString = StringUtils.displayArray(
      dbMember.ReceivedWarnings,
      {
        emptyOutput: none,
        maxItems: 20,
        maxTotalLength: EmbedConstants.FIELD_VALUE_MAX_LENGTH - 50,
        stringify: (warn) => WarnServices.stringifyWarn(warn, true, 50),
        joinString: '\n- ',
        prefix: '\n- ',
      },
    );

    const embed = client.embeds.branding({
      description: roleOutput,
      author: {
        name: target.user.username,
        iconURL: targetUser.displayAvatarURL({ forceStatic: false }),
      },
      fields: [
        {
          name: Lang.t('general:discord.joinedServer'),
          value: joinedServer,
          inline: true,
        },
        {
          name: Lang.t('general:discord.joinedDiscord'),
          value: joinedDiscord,
          inline: true,
        },
        {
          name: 'Moderation Cases/History',
          value: stripIndents`
            **Moderation Score:** ${resolvedWarns.after} (low = good, high = bad)
            **Received Warnings:** ${receivedWarningsString}
          `,
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
