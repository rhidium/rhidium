import { guildSettingsFromCache, updateGuildSettings } from '@/database';
import { LoggingServices } from '@/services';
import { SlashCommandBuilder } from 'discord.js';
import { ChatInputCommand, InteractionUtils, PermLevel } from '@rhidium/core';
import { Lang } from 'lib/i18n';

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

    const guildSettings = await guildSettingsFromCache(interaction.guildId);
    if (!guildSettings) {
      await AdministratorRoleCommand.reply(
        interaction,
        client.embeds.error(Lang.t('general:settings.notFound')),
      );
      return;
    }

    if (remove) {
      guildSettings.adminRoleId = null;
      await updateGuildSettings(guildSettings, {
        data: { adminRoleId: null },
      });
      await AdministratorRoleCommand.reply(
        interaction,
        client.embeds.success(Lang.t('commands:admin-role.removed')),
      );
      void LoggingServices.adminLog(
        interaction.guild,
        client.embeds.info({
          title: Lang.t('commands:admin-role.removedTitle'),
          description: Lang.t('commands:admin-role.removedBy', {
            username: interaction.user.username,
          }),
        }),
      );
      return;
    }

    if (!role) {
      await AdministratorRoleCommand.reply(
        interaction,
        client.embeds.branding({
          fields: [
            {
              name: Lang.t('commands:admin-role.title'),
              value: guildSettings.adminRoleId
                ? `<@&${guildSettings.adminRoleId}>`
                : Lang.t('general:notSet'),
            },
          ],
        }),
      );
      return;
    }

    guildSettings.adminRoleId = role.id;
    await updateGuildSettings(guildSettings, {
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
    void LoggingServices.adminLog(
      interaction.guild,
      client.embeds.info({
        title: Lang.t('commands:admin-role.changedTitle'),
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

export default AdministratorRoleCommand;
