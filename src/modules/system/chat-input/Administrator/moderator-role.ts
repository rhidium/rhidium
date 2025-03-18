import { LoggingServices } from '../../services';
import { SlashCommandBuilder } from 'discord.js';
import {
  Lang,
  ChatInputCommand,
  InteractionUtils,
  PermLevel,
  Database,
} from '@core';

const ModeratorRoleCommand = new ChatInputCommand({
  permLevel: PermLevel.Administrator,
  isEphemeral: true,
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setDescription(
      'Set the role that determines who can use Moderator commands',
    )
    .addRoleOption((option) =>
      option
        .setName('role')
        .setDescription(
          'The role that should be able to use Moderator commands',
        )
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName('remove')
        .setDescription('Remove the Moderator role')
        .setRequired(false),
    ),
  run: async (client, interaction) => {
    const { options } = interaction;
    const role = options.getRole('role');
    const remove = options.getBoolean('remove') ?? false;

    const guildAvailable = InteractionUtils.requireAvailableGuild(
      client,
      interaction,
    );
    if (!guildAvailable) return;

    await ModeratorRoleCommand.deferReplyInternal(interaction);

    const guildSettings = await Database.Guild.resolve(interaction.guildId);
    if (!guildSettings) {
      await ModeratorRoleCommand.reply(
        interaction,
        client.embeds.error(Lang.t('general:settings.notFound')),
      );
      return;
    }

    if (remove) {
      guildSettings.modRoleId = null;
      await Database.Guild.update({
        where: { id: interaction.guildId },
        data: { modRoleId: null },
      });
      await ModeratorRoleCommand.reply(
        interaction,
        client.embeds.success(Lang.t('commands:mod-role.removed')),
      );
      void LoggingServices.adminLog(
        interaction.guild,
        client.embeds.info({
          title: Lang.t('commands:mod-role.removedTitle'),
          description: Lang.t('commands:mod-role.removedBy', {
            username: interaction.user.username,
          }),
        }),
      );
      return;
    }

    if (!role) {
      await ModeratorRoleCommand.reply(
        interaction,
        client.embeds.branding({
          fields: [
            {
              name: Lang.t('commands:mod-role.title'),
              value: guildSettings.modRoleId
                ? `<@&${guildSettings.modRoleId}>`
                : Lang.t('general:notSet'),
            },
          ],
        }),
      );
      return;
    }

    guildSettings.modRoleId = role.id;
    await Database.Guild.update({
      where: { id: interaction.guildId },
      data: { modRoleId: role.id },
    });
    await ModeratorRoleCommand.reply(
      interaction,
      client.embeds.success(
        Lang.t('commands:mod-role.changed', {
          role: `<@&${role.id}>`,
        }),
      ),
    );
    void LoggingServices.adminLog(
      interaction.guild,
      client.embeds.info({
        title: Lang.t('commands:mod-role.changedTitle'),
        fields: [
          {
            name: Lang.t('general:role'),
            value: `<@&${role.id}>`,
            inline: true,
          },
          {
            name: Lang.t('general:member'),
            value: interaction.user.toString(),
            inline: true,
          },
        ],
      }),
    );
    return;
  },
});

export default ModeratorRoleCommand;
