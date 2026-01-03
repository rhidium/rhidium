import { Database } from '@core/database/wrappers';
import { settingsEmbed } from '../chat-input/administrator/settings/shared';
import { Command } from '@core/commands/base';
import { CommandType } from '@core/commands/types';
import { PermLevel } from '@core/commands/permissions';

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
