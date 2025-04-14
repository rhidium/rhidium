import { Command, CommandType, Permissions } from '@core/commands';
import { I18n } from '@core/i18n';
import { SlashCommandUserOption } from 'discord.js';

const PermLevelCommand = new Command({
  type: CommandType.ChatInputPlain,
  enabled: {
    guildOnly: true,
  },
  interactions: {
    replyEphemeral: true,
  },
  data: (builder) =>
    builder
      .setName('perm-level')
      .setDescription('Check the permission level of a user')
      .addUserOption(
        new SlashCommandUserOption()
          .setName('user')
          .setDescription('The user to check the permission level of')
          .setRequired(false),
      ),
  run: async ({ interaction }) => {
    const { guild, options } = interaction;
    const targetUser = options.getUser('user', false);
    const member = targetUser
      ? ((await guild?.members.fetch(targetUser.id).catch(() => null)) ?? null)
      : interaction.member;
    const memberPermLevelName = I18n.localize(
      `core:permissions.levels.${Permissions.intToString(
        await Permissions.resolveForMember(member, guild),
      )}`,
      interaction,
    );
    await PermLevelCommand.reply(interaction, {
      content: targetUser
        ? I18n.localize('core:permissions.theirLevel', interaction, {
            user: targetUser.toString(),
            level: memberPermLevelName,
          })
        : I18n.localize('core:permissions.yourLevel', interaction, {
            level: memberPermLevelName,
          }),
    });
  },
});

export default PermLevelCommand;
