import { SlashCommandBuilder, SlashCommandUserOption } from 'discord.js';
import {
  ChatInputCommand,
  PermissionUtils,
  resolvePermLevel,
} from '@rhidium/core';
import { Lang } from 'lib/i18n';

const PermLevelCommand = new ChatInputCommand({
  isEphemeral: true,
  aliases: ['pl'],
  data: new SlashCommandBuilder().addUserOption(
    new SlashCommandUserOption()
      .setName('user')
      .setDescription('The user to check the permission level of')
      .setRequired(false),
  ),
  run: async (client, interaction) => {
    const { guild, options } = interaction;
    const targetUser = options.getUser('user', false);
    const member = targetUser
      ? ((await guild?.members.fetch(targetUser.id).catch(() => null)) ?? null)
      : interaction.member;
    const memberPermLevel = await PermissionUtils.resolveMemberPermLevel(
      client,
      member,
      guild,
    );
    const memberPermLevelName = resolvePermLevel(memberPermLevel);
    await PermLevelCommand.reply(interaction, {
      content: targetUser
        ? Lang.t('commands:perm-level.theirPermLevel', {
            user: `${targetUser}`,
            level: memberPermLevel,
            levelName: memberPermLevelName,
          })
        : Lang.t('commands:perm-level.yourPermLevel', {
            level: memberPermLevel,
            levelName: memberPermLevelName,
          }),
    });
  },
});

export default PermLevelCommand;
