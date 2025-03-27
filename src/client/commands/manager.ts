import { Client, Collection } from 'discord.js';
import { AnyCommand, CommandBase } from './base';
import debug, { Debugger } from '@client/debug';
import { Logger } from '@client/logger';
import { Embeds } from '@client/config';
import { AbstractRESTClient, NoOpRESTClient, RESTClient } from './rest';

class CommandManager {
  public REST: AbstractRESTClient;
  private readonly debug: Debugger;
  public readonly commands: Collection<string, AnyCommand>;

  public constructor() {
    this.commands = new Collection();
    this.debug = debug.commands.manager;
    this.REST = new NoOpRESTClient();
  }

  public register(command: AnyCommand): void {
    this.debug(
      `Registering command ${command.data.name} of type ${command.type}`,
    );

    if (this.has(command.data.name)) {
      throw new Error(`Command ${command.data.name} is already registered`);
    }

    this.commands.set(command.data.name, CommandBase.buildApiCommand(command));
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

  /**
   * Initializes the command manager with an ready/logged in client.
   * This function should be called *after* registering all commands.
   * @param client The client to initialize the command manager with
   */
  public initialize(client: Client<true>): void {
    this.debug('Initializing command manager');

    this.REST = RESTClient.getInstance(
      client,
      this.commands.map((c) => c.data.toJSON()),
    );

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

      let fn = command.run;
      const isChatInputCommand = safeInteraction.isChatInputCommand();
      const subcommand = isChatInputCommand
        ? safeInteraction.options.getSubcommand(false)
        : null;
      const subcommandGroup = isChatInputCommand
        ? safeInteraction.options.getSubcommandGroup(false)
        : null;
      const controller =
        subcommandGroup && subcommand
          ? command.controllers[`${subcommandGroup}.${subcommand}`]
          : subcommandGroup || subcommand
            ? command.controllers[(subcommandGroup || subcommand)!]
            : null;

      if (
        (subcommand || subcommandGroup) &&
        Object.keys(command.controllers).length > 0 &&
        typeof controller === 'function'
      ) {
        fn = controller;
      }

      try {
        await fn(client, safeInteraction);
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
}

export { CommandManager };
