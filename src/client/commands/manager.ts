import { Client, Collection, REST } from 'discord.js';
import { AnyCommand, CommandBase } from './base';
import debug, { Debugger } from '@client/debug';
import { Logger } from '@client/logger';
import { Embeds } from '@client/config';

class CommandManager {
  private readonly debug: Debugger;
  public readonly commands: Collection<string, AnyCommand>;

  public constructor() {
    this.commands = new Collection();
    this.debug = debug.commands.manager;
  }

  public register(command: AnyCommand): void {
    this.debug(
      `Registering command ${command.data.name} of type ${command.type}`,
    );

    if (this.has(command.data.name)) {
      throw new Error(`Command ${command.data.name} is already registered`);
    }

    this.commands.set(command.data.name, command);
  }

  public unregister(command: AnyCommand): void {
    this.debug(`Unregistering command ${command.data.name}`);

    if (!this.has(command.data.name)) {
      throw new Error(`Command ${command.data.name} is not registered`);
    }

    this.commands.delete(command.data.name);
  }

  public unregisterAll(): void {
    this.debug('Unregistering all commands');

    this.commands.clear();
  }

  public get(name: string): AnyCommand | undefined {
    this.debug(`Getting command ${name}`);

    return this.commands.get(name);
  }

  public has(name: string): boolean {
    this.debug(`Checking if command ${name} exists`);

    return this.commands.has(name);
  }

  public initialize(client: Client<true>): void {
    this.debug('Initializing command manager');

    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isCommand()) return;

      const command = this.commands.get(interaction.commandName);

      if (!command) {
        Logger.warn(
          `Command ${interaction.commandName} is not registered, ignoring`,
        );
        return;
      }

      const safeInteraction = await CommandBase.handleInteraction(
        command,
        interaction,
      );

      if (typeof safeInteraction === 'string') {
        Logger.error(
          `Failed to handle interaction for command ${command.data.name}: ${safeInteraction}`,
        );
        await command.reply(
          interaction,
          Embeds.error(safeInteraction + ', please try again later'),
        );
        return;
      }

      try {
        await command.run(client, safeInteraction);
      } catch (error) {
        Logger.error(error);
        await command.reply(
          interaction,
          Embeds.error(
            'There was an error while executing this command, please try again later',
          ),
        );
      }
    });
  }

  public async syncCommands(
    client: Client<true>,
    guildId?: string | null,
  ): Promise<void> {
    this.debug('Syncing commands');

    const rest = new REST({ version: '10' }).setToken(client.token);
    const commands = this.commands.map((command) => command.data.toJSON());

    this.debug('Commands to sync: %o', commands);

    if (guildId) {
      if (!(await client.guilds.fetch(guildId).catch(() => null))) {
        Logger.warn(`Guild ${guildId} not found, skipping command sync`);
        return;
      }

      this.debug('Syncing commands to guild %s', guildId);
      await rest.put(
        `/applications/${client.application.id}/guilds/${guildId}/commands`,
        {
          body: commands,
        },
      );
    } else {
      this.debug('Syncing commands globally');
      await rest.put(`/applications/${client.application.id}/commands`, {
        body: commands,
      });
    }

    this.debug('Commands synced');
  }
}

export { CommandManager };
