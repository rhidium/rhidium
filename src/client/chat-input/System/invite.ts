import { OAuth2Scopes, SlashCommandBuilder } from 'discord.js';
import {
  ChatInputCommand,
  CommandCooldownType,
  PermissionUtils,
  UnitConstants,
} from '@rhidium/core';
import { Lang } from 'lib/i18n';

const InviteCommand = new ChatInputCommand({
  data: new SlashCommandBuilder(),
  cooldown: {
    type: CommandCooldownType.Channel,
    usages: 1,
    duration: 30 * UnitConstants.MS_IN_ONE_SECOND,
  },
  run: async (client, interaction) => {
    const commands = client.commandManager.apiCommands;
    const allUniqueClientPermissions = PermissionUtils.uniqueCommandPermissions(
      commands.toJSON(),
    );
    const inviteLink = client.generateInvite({
      scopes: [OAuth2Scopes.ApplicationsCommands, OAuth2Scopes.Bot],
      permissions: allUniqueClientPermissions,
    });
    await InviteCommand.reply(
      interaction,
      client.embeds.branding({
        description: Lang.t('commands:invite.prompt', { link: inviteLink }),
      }),
    );
  },
});

export default InviteCommand;
