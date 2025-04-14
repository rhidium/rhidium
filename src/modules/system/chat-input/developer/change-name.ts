import {
  Command,
  CommandThrottleType,
  CommandType,
  PermLevel,
} from '@core/commands';
import { appConfig, Embeds } from '@core/config';
import { UnitConstants } from '@core/constants';

const ChangeNameCommand = new Command({
  type: CommandType.ChatInputPlain,
  permissions: {
    level: PermLevel['Bot Administrator'],
  },
  enabled: {
    guilds: appConfig.client.development_server_id
      ? [appConfig.client.development_server_id]
      : false,
  },
  throttle: {
    // Global Rate Limit of 2 per hour
    enabled: true,
    type: CommandThrottleType.Global,
    limit: 2,
    duration: UnitConstants.MS_IN_ONE_HOUR,
  },
  data: (builder) =>
    builder
      .setName('change-name')
      .setDescription("Change the bot's username")
      .setDefaultMemberPermissions(0)
      .addStringOption((option) =>
        option
          .setName('name')
          .setDescription('The new name to set')
          .setRequired(true),
      ),
  run: async ({ client, interaction }) => {
    const { options } = interaction;
    const newName = options.getString('name', true);

    try {
      await client.user.setUsername(newName);
    } catch (err) {
      await ChangeNameCommand.reply(
        interaction,
        Embeds.error(
          `Failed to set new name: ${err instanceof Error ? err.message : err}`,
        ),
      );
      return;
    }

    await ChangeNameCommand.reply(
      interaction,
      Embeds.success(`Successfully set name to **\`${newName}\`**`),
    );
  },
});

export default ChangeNameCommand;
