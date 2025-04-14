import { Command, CommandType, PermLevel } from '@core/commands';
import CodeModalCommand from '../../modals/eval-modal';

const EvalCommand = new Command({
  type: CommandType.ChatInputPlain,
  permissions: {
    level: PermLevel['Bot Administrator'],
  },
  data: (builder) =>
    builder
      .setName('eval')
      .setDescription('Evaluate arbitrary JavaScript code')
      .setDefaultMemberPermissions(0),
  run: async ({ interaction }) => {
    await interaction.showModal(CodeModalCommand.data);
  },
});

export default EvalCommand;
