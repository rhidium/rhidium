import { SlashCommandBuilder } from 'discord.js';
import {
  ChatInputCommand,
  CommandCooldownType,
  PermLevel,
  UnitConstants,
} from '@core';

const ChangeNameCommand = new ChatInputCommand({
  permLevel: PermLevel['Bot Administrator'],
  cooldown: {
    // Global Rate Limit of 2 per hour
    type: CommandCooldownType.Global,
    usages: 2,
    duration: UnitConstants.MS_IN_ONE_HOUR,
    persistent: true,
  },
  data: new SlashCommandBuilder()
    .setDescription("Change the bot's username")
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('The new name to set')
        .setRequired(true),
    ),
  run: async (client, interaction) => {
    const { options } = interaction;
    const newName = options.getString('name', true);

    try {
      await client.user.setUsername(newName);
    } catch (err) {
      await ChangeNameCommand.reply(
        interaction,
        client.embeds.error(
          `Failed to set new name: ${err instanceof Error ? err.message : err}`,
        ),
      );
      return;
    }

    await ChangeNameCommand.reply(
      interaction,
      client.embeds.success(`Successfully set name to **\`${newName}\`**`),
    );
  },
});

export default ChangeNameCommand;
