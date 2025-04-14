import { ContextMenuCommandBuilder } from 'discord.js';
import { warnModal } from '../modals/warn';
import { Command, CommandType, PermLevel } from '@core/commands';

const WarnContextMenu = new Command({
  type: CommandType.UserContextMenu,
  data: new ContextMenuCommandBuilder().setName('Warn / New Case'),
  permissions: {
    level: PermLevel.Moderator,
  },
  enabled: {
    guildOnly: true,
  },
  interactions: {
    refuseUncached: true,
    replyEphemeral: true,
  },
  run: async ({ interaction }) => {
    await interaction.showModal(warnModal(interaction.targetUser));
  },
});

export default WarnContextMenu;
