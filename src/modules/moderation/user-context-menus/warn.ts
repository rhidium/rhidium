import { UserContextCommand } from '@core';
import { ContextMenuCommandBuilder } from 'discord.js';
import { warnModal } from '../modals/warn';

const WarnUserContextMenu = new UserContextCommand({
  data: new ContextMenuCommandBuilder().setName('Warn / New Case'),
  run: async (_client, interaction) => {
    await interaction.showModal(warnModal(interaction.targetUser));
  },
});

export default WarnUserContextMenu;
