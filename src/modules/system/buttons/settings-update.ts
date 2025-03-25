import { ButtonCommand, InteractionUtils, PermLevel } from '@core';
import { settingsPrompts } from '../chat-input/Administrator/settings/prompts';
import { handleSettingsUpdate } from '../chat-input/Administrator/settings/shared';

const SettingsUpdateCommand = new ButtonCommand({
  customId: 'settings-update',
  guildOnly: true,
  permLevel: PermLevel.Administrator,
  isEphemeral: true,
  run: async (client, interaction) => {
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) return;

    const { customId } = interaction;
    const [, promptId] = customId.split('@');
    const prompt = settingsPrompts.find((p) => p.id === promptId);

    if (!promptId || !prompt) {
      await SettingsUpdateCommand.reply(interaction, {
        embeds: [client.embeds.error('Unable to parse setting identifier.')],
      });
      return;
    }

    await interaction.deferUpdate();

    await handleSettingsUpdate(client, interaction, false, prompt.id);
  },
});

export default SettingsUpdateCommand;
