import { Client, Collection } from 'discord.js';
import { AnyCommand, APICommand, Command, CommandBase } from './base';
import debug, { Debugger } from '@client/debug';
import { Logger } from '@client/logger';
import { Embeds } from '@client/config';
import { AbstractRESTClient, NoOpRESTClient, RESTClient } from './rest';
import { CommandType } from './types';

class CommandManager {
  public REST: AbstractRESTClient;
  private readonly debug: Debugger;
  public readonly commands: Collection<string, Command>;
  public get apiCommands(): Collection<string, APICommand> {
    this.debug('Getting API commands');
    return this.byFilter(CommandBase.isApiCommand, CommandBase.isEnabled);
  }

  public constructor() {
    this.commands = new Collection();
    this.debug = debug.commands.manager;
    this.REST = new NoOpRESTClient();
  }

  public register(...commands: AnyCommand[]): void {
    const withChildren = commands.flatMap((command) => [
      command,
      ...command.children,
    ]);

    withChildren.forEach((command) => {
      this.debug(`Registering command ${command.id} of type ${command.type}`);

      if (this.has(command.id)) {
        throw new Error(`Command ${command.id} is already registered`);
      }

      this.commands.set(
        command.id,
        Command.isApiCommand(command)
          ? (CommandBase.buildApiCommand(command) as Command)
          : (command as Command),
      );
    });
  }

  public unregister(command: AnyCommand): void {
    this.debug(`Unregistering command ${command.id}`);

    if (!this.has(command.id)) {
      throw new Error(`Command ${command.id} is not registered`);
    }

    this.commands.delete(command.id);
  }

  public unregisterAll(): void {
    this.debug('Unregistering all commands');

    this.commands.clear();
  }

  public get(name: string): AnyCommand | undefined {
    this.debug(`Getting command ${name}`);

    return this.commands.get(name) as AnyCommand | undefined;
  }

  public has(name: string): boolean {
    this.debug(`Checking if command ${name} exists`);

    return this.commands.has(name);
  }

  public byFilter<U extends AnyCommand, F extends boolean>(
    ...filters: ((command: AnyCommand) => F)[]
  ): Collection<string, U> {
    this.debug('Getting commands by filter');

    return this.commands.filter((command) =>
      filters.every((filter) => (filter as (command: Command) => F)(command)),
    ) as Collection<string, U>;
  }

  /**
   * Initializes the command manager with a ready/logged in client.
   * This function should be called *after* registering all commands.
   * @param client The client to initialize the command manager with
   * @returns The REST client instance, with all commands registered
   */
  public initialize(client: Client<true>): AbstractRESTClient {
    this.debug('Initializing command manager');

    this.REST = RESTClient.getInstance(
      client,
      this.apiCommands.map((c) => c.data.toJSON()),
    );

    client.on('interactionCreate', async (interaction) => {
      if (interaction.isAutocomplete()) return; // [DEV]

      const commandIdentifier =
        'customId' in interaction
          ? interaction.customId
          : interaction.commandName;

      this.debug(`Received interaction for command ${commandIdentifier}`);

      const command = this.commands.get(commandIdentifier);

      if (!command) {
        Logger.warn(`Command ${commandIdentifier} is not registered, ignoring`);
        return;
      }

      const expectedInteractionType = CommandBase.resolveDiscordType(
        command.type,
      );

      if (interaction.type !== expectedInteractionType) {
        Logger.warn(
          `Interaction for command ${commandIdentifier} is not of (expected) type ${expectedInteractionType}, ignoring`,
        );
        return;
      }

      const safeInteraction = await CommandBase.handleInteraction(
        command,
        interaction,
      );

      if (typeof safeInteraction === 'string') {
        Logger.error(
          `Failed to handle interaction for command ${command.id}: ${safeInteraction}`,
        );
        await command.reply(
          interaction,
          Embeds.error(safeInteraction + ', please try again later'),
        );
        return;
      }

      const fn = CommandBase.runFunctionResolver<
        CommandType,
        boolean,
        boolean,
        void | Promise<void>
      >(command, safeInteraction);

      if (fn === null) {
        Logger.error(
          `Command ${command.id} has no function to run, and no controller was found, ignoring`,
        );
        await command.reply(
          interaction,
          Embeds.error(
            'Something went wrong while executing this command, please try again later. This issue has been reported to the developers.',
          ),
        );
        return;
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

    return this.REST;
  }
}

export { CommandManager };
