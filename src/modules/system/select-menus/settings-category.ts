import {
  Database,
  InteractionUtils,
  PermLevel,
  SelectMenuCommand,
} from '@core';
import { settingsEmbed } from '../chat-input/Administrator/settings/shared';

const SettingsCategoryCommand = new SelectMenuCommand({
  guildOnly: true,
  permLevel: PermLevel.Administrator,
  customId: 'settings-category',
  run: async (client, interaction) => {
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) return;

    const { values } = interaction;
    const categoryIndStr = values[0];
    const categoryInd = parseInt(categoryIndStr ?? '');

    await interaction.deferUpdate();

    await settingsEmbed(
      client,
      interaction,
      await Database.Guild.resolve(interaction.guildId),
      categoryIndStr && categoryInd ? categoryInd : 0,
    );
  },
});

export default SettingsCategoryCommand;
