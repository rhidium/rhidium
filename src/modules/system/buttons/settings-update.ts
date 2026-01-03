import { Command } from '@core/commands/base';
import { CommandType } from '@core/commands/types';
import { PermLevel } from '@core/commands/permissions';
import { Embeds } from '@core/config/embeds';
import { settingsPrompts } from '../chat-input/administrator/settings/prompts';
import { handleSettingsUpdate } from '../chat-input/administrator/settings/shared';

const SettingsUpdateCommand = new Command({
  type: CommandType.Button,
  enabled: {
    guildOnly: true,
  },
  permissions: {
    level: PermLevel.Administrator,
  },
  interactions: {
    replyEphemeral: true,
    deferReply: false,
    refuseUncached: true,
  },
  data: (builder) => builder.setCustomId('settings-update').setEmoji('⚙️'),
  run: async ({ client, interaction }) => {
    const { customId } = interaction;
    const [, promptId] = customId.split('@');
    const prompt = settingsPrompts.find((p) => p.id === promptId);

    if (!promptId || !prompt) {
      await SettingsUpdateCommand.reply(interaction, {
        embeds: [Embeds.error('Unable to parse setting identifier.')],
      });
      return;
    }

    await interaction.deferUpdate();

    await handleSettingsUpdate(client, interaction, false, prompt.id);
  },
});

export default SettingsUpdateCommand;
