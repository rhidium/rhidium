import { Command, CommandType, PermLevel } from '@core/commands';
import { Database } from '@core/database';
import { settingsEmbed } from '../chat-input/administrator/settings/shared';

const SettingsCategoryCommand = new Command({
  type: CommandType.StringSelect,
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
  data: (data) => data.setCustomId('settings-category'),
  run: async ({ interaction }) => {
    const { values } = interaction;
    const categoryIndStr = values[0];
    const categoryInd = parseInt(categoryIndStr ?? '');

    await interaction.deferUpdate();

    await settingsEmbed(
      interaction,
      await Database.Guild.resolve(interaction.guildId),
      categoryIndStr && categoryInd ? categoryInd : 0,
    );
  },
});

export default SettingsCategoryCommand;
