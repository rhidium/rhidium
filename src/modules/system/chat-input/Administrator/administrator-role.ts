import { SlashCommandBuilder } from 'discord.js';
import {
  Lang,
  ChatInputCommand,
  InteractionUtils,
  PermLevel,
  Database,
  AuditLogType,
} from '@core';

const AdministratorRoleCommand = new ChatInputCommand({
  permLevel: PermLevel.Administrator,
  isEphemeral: true,
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setDescription(
      'Set the role that determines who can use Administrator commands',
    )
    .addRoleOption((option) =>
      option
        .setName('role')
        .setDescription(
          'The role that should be able to use Administrator commands',
        )
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName('remove')
        .setDescription('Remove the Administrator role')
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

    await AdministratorRoleCommand.deferReplyInternal(interaction);

    const [guild, , user] =
      await Database.Guild.resolveFromInteraction(interaction);

    if (remove) {
      const updatedGuild = await Database.Guild.update({
        where: { id: interaction.guildId },
        data: { adminRoleId: null },
      });
      await AdministratorRoleCommand.reply(
        interaction,
        client.embeds.success(Lang.t('commands:admin-role.removed')),
      );
      void Database.AuditLog.util({
        client,
        type: AuditLogType.ADMIN_ROLE_REMOVED,
        user,
        guild,
        data: { before: guild, after: updatedGuild },
      });
      return;
    }

    if (!role) {
      await AdministratorRoleCommand.reply(
        interaction,
        client.embeds.branding({
          fields: [
            {
              name: Lang.t('commands:admin-role.title'),
              value: guild.adminRoleId
                ? `<@&${guild.adminRoleId}>`
                : Lang.t('general:notSet'),
            },
          ],
        }),
      );
      return;
    }

    const updatedGuild = await Database.Guild.update({
      where: { id: interaction.guildId },
      data: { adminRoleId: role.id },
    });
    await AdministratorRoleCommand.reply(
      interaction,
      client.embeds.success(
        Lang.t('commands:admin-role.changed', {
          role: `<@&${role.id}>`,
        }),
      ),
    );
    void Database.AuditLog.util({
      client,
      type: AuditLogType.ADMIN_ROLE_CHANGED,
      user,
      guild,
      data: { before: guild, after: updatedGuild },
    });
    return;
  },
});

export default AdministratorRoleCommand;
