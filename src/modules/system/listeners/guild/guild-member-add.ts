import { ClientEventListener } from '@core/commands';
import { appConfig, Embeds } from '@core/config';
import { AuditLogType, Database } from '@core/database';
import { I18n } from '@core/i18n';
import { Logger } from '@core/logger';
import { Placeholder } from '@core/placeholders';
import { TimeUtils } from '@core/utils';
import { EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';

const requiredPermissions = [
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
];

const GuildMemberAdd = new ClientEventListener({
  event: Events.GuildMemberAdd,
  run: async (client, member) => {
    const { guild: discordGuild } = member;

    const guild = await Database.Guild.resolve(discordGuild.id);

    if (guild.autoRoleIds.length) {
      const me =
        discordGuild.members.me ?? (await discordGuild.members.fetchMe());
      const rolesToAdd = guild.autoRoleIds.filter(
        (roleId) =>
          !member.roles.cache.has(roleId) &&
          me.roles.highest.comparePositionTo(roleId) > 0,
      );
      if (rolesToAdd.length) {
        await member.roles
          .add(rolesToAdd)
          .then(async () => {
            await Database.AuditLog.util({
              client,
              guild,
              data: {
                target: member.id,
                added: rolesToAdd,
                roles: guild.autoRoleIds,
              },
              type: AuditLogType.AUTO_ROLES_ADDED,
              user: client.user.id,
            });
          })
          .catch((error) => {
            Logger.error('Error encountered while adding auto roles', error);
          });
      }
    }

    if (!guild.memberJoinChannelId) return;

    const channel = discordGuild.channels.cache.get(guild.memberJoinChannelId);
    if (
      !channel ||
      !channel.permissionsFor(client.user.id)?.has(requiredPermissions) ||
      !channel.isTextBased()
    ) {
      return;
    }

    const accountCreatedOutput = TimeUtils.discordInfoTimestamp(
      member.user.createdTimestamp,
    );
    const { MemberJoinEmbed } = guild;
    const baseEmbed = new EmbedBuilder()
      .setColor(appConfig.colors.primary)
      .setAuthor({
        name: member.user.username,
        iconURL: member.user.displayAvatarURL({ forceStatic: false }),
      })
      .setTitle(I18n.localize('core:discord.memberJoined.title', discordGuild))
      .setDescription(
        I18n.localize('core:discord.memberJoined.description', discordGuild, {
          user: member.toString(),
          guild: discordGuild.name,
        }),
      )
      .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
      .addFields(
        {
          name: I18n.localize('core:discord.accountCreated', discordGuild),
          value: accountCreatedOutput,
          inline: true,
        },
        {
          name: I18n.localize('core:discord.memberCount', discordGuild),
          value: discordGuild.memberCount.toLocaleString(),
          inline: true,
        },
      );

    const rawEmbed = Embeds.fromEmbedModel(MemberJoinEmbed, baseEmbed);
    const placeholders = Placeholder.parseContext({
      guild: discordGuild,
      user: member.user,
      member,
      channel,
    });
    const embed = Placeholder.applyToEmbed(rawEmbed, placeholders);
    const resolvedMessage = guild.MemberJoinEmbed?.messageText
      ? Placeholder.apply(guild.MemberJoinEmbed.messageText, placeholders)
      : '';

    channel
      .send({ content: resolvedMessage, embeds: [embed] })
      .catch((error) => {
        Logger.error(
          'Error encountered while sending member join message after checking permissions',
          error,
        );
      });
  },
});

export default GuildMemberAdd;
