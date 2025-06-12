import { Command, CommandType, PermLevel } from '@core/commands';
import CodeModalCommand from '../../modals/eval-modal';
import { appConfig } from '@core/config';

const EvalCommand = new Command({
  type: CommandType.ChatInputPlain,
  permissions: {
    level: PermLevel['Bot Administrator'],
  },
  enabled: {
    guilds: appConfig.client.development_server_id
      ? [appConfig.client.development_server_id]
      : false,
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
