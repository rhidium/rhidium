import { appConfig, Client, Guild, InteractionUtils } from '@core';
import {
  Guild as _Guild,
  GuildMember,
  User as _User,
  RepliableInteraction,
} from 'discord.js';

const isProd = appConfig.NODE_ENV === 'production';

type DiscordUser = _User;
type DiscordGuild = _Guild;

type CanModerateTargetOptions = {
  targetUser: DiscordUser;
  issuerMember: GuildMember;
  discordGuild: DiscordGuild;
  guild: Guild;
};
type CanModerateTargetResult = GuildMember | [false, string];

type HandleCanModerateTargetOptions = CanModerateTargetOptions & {
  client: Client;
  interaction: RepliableInteraction;
};

class ModerationPermissionServices {
  static readonly canModerateTarget = async (
    options: CanModerateTargetOptions,
  ): Promise<CanModerateTargetResult> => {
    const { targetUser, issuerMember, discordGuild, guild } = options;

    if (targetUser.bot) {
      return [false, 'The target is a bot.'];
    }

    if (discordGuild.ownerId === targetUser.id) {
      return [false, 'You cannot moderate the owner of the server.'];
    }

    const target = await discordGuild.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (target === null) {
      return [false, 'The target is not in this server.'];
    }

    const me =
      discordGuild.members.me ??
      (await discordGuild.members
        .fetch(discordGuild.client.user.id)
        .catch(() => null));

    if (me === null) {
      return [
        false,
        'I am currently not able to access the member list of this server, please try again later.',
      ];
    }

    if (isProd) {
      if (issuerMember.user.id === targetUser.id) {
        return [false, 'You cannot moderate yourself.'];
      }

      if (
        issuerMember.roles.highest.comparePositionTo(target.roles.highest) <= 0
      ) {
        return [
          false,
          'You cannot moderate a user with a role higher than or equal to yours.',
        ];
      }

      if (
        !guild.modsCanModerateMods &&
        guild.modRoleIds.some((roleId) => target.roles.cache.has(roleId))
      ) {
        return [false, 'You cannot moderate other moderators.'];
      }

      if (issuerMember.roles.highest.comparePositionTo(me.roles.highest) <= 0) {
        return [
          false,
          'You cannot moderate a user with a role higher than or equal to mine, as I am not allowed to moderate them.',
        ];
      }
    }

    return target;
  };

  static readonly handleCanModerateTarget = async (
    options: HandleCanModerateTargetOptions,
  ): Promise<GuildMember | false> => {
    const { client, interaction } = options;
    const result = await this.canModerateTarget(options);

    if (Array.isArray(result)) {
      const [, message] = result;

      await InteractionUtils.replyEphemeral(interaction, {
        embeds: [client.embeds.error(message)],
      });

      return false;
    }

    return result;
  };
}

export { ModerationPermissionServices };
