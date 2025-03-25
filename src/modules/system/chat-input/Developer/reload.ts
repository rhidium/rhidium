import { SlashCommandBuilder } from 'discord.js';
import {
  ChatInputCommand,
  PermLevel,
  isAutoCompleteResponseType,
  isCommand,
} from '@core';
import CommandOption from '../../auto-completes/command';

/**
 * Reload doesn't work very well for TS in general (since you have
 * to re-build and load a command from an updated code-base), but I know
 * people will ask for it so here it is.
 *
 * Only ever relevant in production mode due to hot-reloading in dev.
 */

const ReloadCommand = new ChatInputCommand({
  disabled: process.env.NODE_ENV !== 'production',
  permLevel: PermLevel['Bot Administrator'],
  isEphemeral: true,
  data: new SlashCommandBuilder()
    .setDescription('Reloads a command')
    .addStringOption(CommandOption.addOptionHandler),
  run: async (client, interaction) => {
    await ReloadCommand.deferReplyInternal(interaction);

    const command = await CommandOption.getValue(interaction, true);
    if (isAutoCompleteResponseType(command)) return;
    const commandCollection = client.commandManager.chatInput;

    try {
      const filePath = command.sourceFile;
      command.unInitialize();
      commandCollection.delete(command.data.name);
      delete require.cache[require.resolve(filePath)];

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const newCommand = require(filePath);
      if (!isCommand(newCommand.default)) {
        await ReloadCommand.reply(
          interaction,
          client.embeds.error(
            `Command at path **\`${filePath}\`** is not a valid command`,
          ),
        );
        return;
      }

      command.load(filePath, client, client.commandManager);
      if (!command.initialized) {
        await ReloadCommand.reply(
          interaction,
          client.embeds.error(
            `Command at path **\`${filePath}\`** failed to initialize`,
          ),
        );
        return;
      }
    } catch (err) {
      client.logger.error(
        `Error encountered while reloading command ${command.data.name}:`,
        err,
      );
      await ReloadCommand.reply(
        interaction,
        client.embeds.error(
          `Command at path **\`${command.sourceFile}\`** failed to reload`,
        ),
      );
      return;
    }

    await ReloadCommand.reply(
      interaction,
      client.embeds.success(
        `Command **\`${command.data.name}\`** was reloaded`,
      ),
    );
  },
});

export default ReloadCommand;
