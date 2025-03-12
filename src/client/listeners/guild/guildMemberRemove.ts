import { embedFromEmbedModel } from '@client/chat-input/Administrator/embeds/helpers';
import { LoggingServices } from '@client/services';
import { EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';
import {
  Lang,
  ClientEventListener,
  PermissionUtils,
  TimeUtils,
  guildFromCache,
  buildPlaceholders,
  replacePlaceholdersAcrossEmbed,
  replacePlaceholders,
} from '@core';

const requiredPermissions = [
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
];

export default new ClientEventListener({
  event: Events.GuildMemberRemove,
  run: async (client, member) => {
    const { logger } = client;
    const { guild } = member;

    const guildSettings = await guildFromCache(guild.id);
    if (!guildSettings || !guildSettings.MemberLeaveChannelId) return;

    const channel = guild.channels.cache.get(
      guildSettings.MemberLeaveChannelId,
    );
    if (!channel) {
      void LoggingServices.adminLog(
        guild,
        client.embeds.error({
          title: Lang.t('commands:member-leave.errorLabel'),
          description: Lang.t('general:errors.noChannel'),
        }),
      );
      return;
    }

    if (!channel.permissionsFor(client.user.id)?.has(requiredPermissions)) {
      void LoggingServices.adminLog(
        guild,
        client.embeds.error({
          title: Lang.t('commands:member-leave.errorLabel'),
          description: Lang.t('general:errors.missingPerms', {
            permissions: PermissionUtils.displayPermissions(
              requiredPermissions.filter(
                (permission) =>
                  !channel.permissionsFor(client.user.id)?.has(permission),
              ),
            ),
            channel: channel.toString(),
          }),
        }),
      );
      return;
    }

    if (!channel.isTextBased()) {
      void LoggingServices.adminLog(
        guild,
        client.embeds.error({
          title: Lang.t('commands:member-leave.errorLabel'),
          description: Lang.t('general:errors.notTextChannel', {
            channel: channel.toString(),
          }),
        }),
      );
      return;
    }

    const accountCreatedOutput = TimeUtils.discordInfoTimestamp(
      member.user.createdTimestamp,
    );
    const joinedAtOutput = member.joinedTimestamp
      ? TimeUtils.discordInfoTimestamp(member.joinedTimestamp)
      : 'Unknown';
    const { MemberLeaveEmbed } = guildSettings;
    const baseEmbed = new EmbedBuilder()
      .setColor(client.colors.primary)
      .setAuthor({
        name: member.user.username,
        iconURL: member.user.displayAvatarURL({ forceStatic: false }),
      })
      .setTitle(Lang.t('commands:member-leave.label'))
      .setDescription(
        Lang.t('commands:member-leave.goodbye', {
          user: member.toString(),
          guild: guild.name,
        }),
      )
      .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
      .addFields(
        {
          name: Lang.t('general:discord.accountCreated'),
          value: accountCreatedOutput,
          inline: true,
        },
        {
          name: Lang.t('general:discord.joinedAt'),
          value: joinedAtOutput,
          inline: true,
        },
        {
          name: Lang.t('general:discord.memberCount'),
          value: guild.memberCount.toLocaleString(),
          inline: true,
        },
      );

    const rawEmbed = embedFromEmbedModel(MemberLeaveEmbed, baseEmbed);
    const placeholders = buildPlaceholders(channel, guild, member, member.user);
    const embed = replacePlaceholdersAcrossEmbed(rawEmbed, placeholders);
    const resolvedMessage = guildSettings.MemberJoinEmbed?.messageText
      ? replacePlaceholders(
          guildSettings.MemberJoinEmbed.messageText,
          placeholders,
        )
      : '';

    channel
      .send({ content: resolvedMessage, embeds: [embed] })
      .catch(async (error) => {
        logger.error(
          'Error encountered while sending member leave message, after checking permissions',
          error,
        );
        void LoggingServices.adminLog(
          guild,
          client.embeds.error({
            title: Lang.t('commands:member-leave.errorLabel'),
            description: Lang.t('general:errors.errAfterPermCheck'),
          }),
        );
      });
  },
});
