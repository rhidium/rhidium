import { WarnServices } from '../services/warn';
import { stripIndents } from 'common-tags';
import { Command, CommandType, PermLevel } from '@core/commands';
import { Embeds } from '@core/config';
import { ArrayUtils, StringUtils, TimeUtils } from '@core/utils';
import { Database } from '@core/database';
import { EmbedConstants } from '@core/constants';
import { I18n } from '@core/i18n';

const UserInfoContextMenu = new Command({
  type: CommandType.UserContextMenu,
  category: 'Moderation',
  data: (builder) => builder.setName('Display User Info'),
  enabled: {
    guildOnly: true, // Note: User Ctx Menus currently not supported through User Install
  },
  permissions: {
    level: PermLevel.Moderator,
  },
  interactions: {
    refuseUncached: true,
    replyEphemeral: true,
  },
  run: async ({ interaction }) => {
    const { guild, targetUser } = interaction;

    if (!guild) {
      await UserInfoContextMenu.reply(
        interaction,
        Embeds.error('This command can only be used in a server.'),
      );
      return;
    }

    const target = await guild.members.fetch(targetUser.id);
    if (!target) {
      await UserInfoContextMenu.reply(
        interaction,
        Embeds.error(
          `Unable to resolve member for ${targetUser}, please try again.`,
        ),
      );
      return;
    }

    const unknown = I18n.localize('common:word.unknown', interaction);
    const none = I18n.localize('common:word.none', interaction);

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

    const [dbMember, dbGuild] = await Database.Member.resolveAndReturnGuild({
      userId: target.id,
      guildId: guild.id,
    });

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

    const embed = Embeds.primary({
      description: roleOutput,
      author: {
        name: target.user.username,
        iconURL: targetUser.displayAvatarURL({ forceStatic: false }),
      },
      fields: [
        {
          name: I18n.localize('core:discord.joinedServer', interaction),
          value: joinedServer,
          inline: true,
        },
        {
          name: I18n.localize('core:discord.joinedDiscord', interaction),
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

    await UserInfoContextMenu.reply(interaction, embed);
  },
});

export default UserInfoContextMenu;
