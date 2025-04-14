import { ClientEventListener } from '@core/commands';
import { appConfig, Embeds } from '@core/config';
import { Database } from '@core/database';
import { I18n } from '@core/i18n';
import { Logger } from '@core/logger';
import { Placeholder } from '@core/placeholders';
import { TimeUtils } from '@core/utils';
import { EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';

const requiredPermissions = [
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
];

const GuildMemberRemove = new ClientEventListener({
  event: Events.GuildMemberRemove,
  run: async (client, member) => {
    const { guild: discordGuild } = member;

    const guild = await Database.Guild.resolve(discordGuild.id);
    if (!guild.memberLeaveChannelId) return;

    const channel = discordGuild.channels.cache.get(guild.memberLeaveChannelId);
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
    const joinedAtOutput = member.joinedTimestamp
      ? TimeUtils.discordInfoTimestamp(member.joinedTimestamp)
      : 'Unknown';
    const { MemberLeaveEmbed } = guild;
    const baseEmbed = new EmbedBuilder()
      .setColor(appConfig.colors.primary)
      .setAuthor({
        name: member.user.username,
        iconURL: member.user.displayAvatarURL({ forceStatic: false }),
      })
      .setTitle(I18n.localize('core:discord.memberLeft.title', discordGuild))
      .setDescription(
        I18n.localize('core:discord.memberLeft.description', discordGuild, {
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
          name: I18n.localize('core:discord.joinedServer', discordGuild),
          value: joinedAtOutput,
          inline: true,
        },
        {
          name: I18n.localize('core:discord.memberCount', discordGuild),
          value: discordGuild.memberCount.toLocaleString(),
          inline: true,
        },
      );

    const rawEmbed = Embeds.fromEmbedModel(MemberLeaveEmbed, baseEmbed);
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
      .catch(async (error) => {
        Logger.error(
          'Error encountered while sending member leave message after checking permissions',
          error,
        );
      });
  },
});

export default GuildMemberRemove;
