import { SlashCommandBuilder } from 'discord.js';
import { ChatInputCommand, PermLevel } from '@rhidium/core';

const DeployCommand = new ChatInputCommand({
  permLevel: PermLevel['Bot Administrator'],
  data: new SlashCommandBuilder()
    .setDescription('Deploy commands globally or in a guild/server')
    .addStringOption((option) =>
      option
        .setName('scope')
        .setDescription('The scope to deploy to')
        .setRequired(true)
        .addChoices(
          { name: 'Global', value: 'global' },
          { name: 'Server', value: 'guild' },
        ),
    )
    .addStringOption((option) =>
      option
        .setName('server')
        .setDescription(
          'The server to deploy to, only used if scope is "Server"',
        )
        .setRequired(false),
    ),
  run: async (client, interaction) => {
    const { options } = interaction;
    const scope = options.getString('scope', true);
    const guildId = options.getString('server', false);

    await DeployCommand.reply(interaction, {
      embeds: [
        client.embeds.waiting(
          `Deploying commands to ${
            scope === 'global' ? 'global' : `guild ${guildId}`
          }`,
        ),
      ],
    });

    let res;
    if (scope === 'global') {
      // If global, deploy global commands right away
      res = await client.commandManager.deployCommands({ type: 'global' });
    } else {
      // Make sure a guild ID was provided
      if (!guildId) {
        await DeployCommand.reply(interaction, {
          embeds: [
            client.embeds.error(
              'No guild/server ID was provided - this command has been cancelled',
            ),
          ],
        });
        return;
      }

      // Deploy development commands to specific (overwrite) guild/server
      else
        res = await client.commandManager.deployCommands({
          type: 'development',
          guildId,
        });
    }

    // User feedback
    await DeployCommand.reply(interaction, {
      content: `Deployed a total of ${res.commands.length} commands ${
        scope === 'global' ? 'globally' : `to guild ${guildId}`
      }`,
    });
  },
});

export default DeployCommand;
