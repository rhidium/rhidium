import { Collection } from 'discord.js';
import { AnyCommand, APICommand, Command, CommandBase } from './base';
import debug, { Debugger } from '@client/debug';
import { Logger } from '@client/logger';
import { Embeds } from '@client/config';
import { AbstractRESTClient, NoOpRESTClient, RESTClient } from './rest';
import { InteractionUtils } from '@client/utils/interaction';
import { StringUtils, TimeUtils } from '@client/utils';
import { Database } from '@client/database';
import { ClientJob } from './jobs';
import { ClientEventListener } from './events';
import Client from '@client/client';

class CommandManager {
  public REST: AbstractRESTClient;
  private readonly debug: Debugger;
  public readonly jobs: Collection<string, ClientJob>;
  public readonly commands: Collection<string, Command>;
  public readonly listeners: Collection<string, ClientEventListener>;
  public get apiCommands(): Collection<string, APICommand> {
    this.debug('Getting API commands');
    return this.byFilter(CommandBase.isApiCommand, CommandBase.isEnabled);
  }

  public constructor() {
    // [DEV] We need (Base)Managers for each...
    this.commands = new Collection();
    this.jobs = new Collection();
    this.listeners = new Collection();
    this.debug = debug.commands.manager;
    this.REST = new NoOpRESTClient();
  }

  public addJobs(...jobs: ClientJob[]): void {
    this.debug(
      'Adding jobs %o',
      jobs.map((job) => job.id),
    );

    jobs.forEach((job) => {
      if (this.jobs.has(job.id)) {
        throw new Error(`Job ${job.id} is already registered`);
      }

      this.jobs.set(job.id, job);
    });
  }

  public removeJob(job: ClientJob): void {
    this.debug(`Removing job ${job.id}`);

    if (!this.jobs.has(job.id)) {
      throw new Error(`Job ${job.id} is not registered`);
    }

    this.jobs.delete(job.id);
  }

  public addListeners(...listeners: ClientEventListener[]): void {
    this.debug(
      'Adding listeners %o',
      listeners.map((listener) => listener.event),
    );

    listeners.forEach((listener) => {
      if (this.listeners.has(listener.event)) {
        throw new Error(
          `Listener for event ${listener.event} is already registered`,
        );
      }

      this.listeners.set(listener.event, listener);
    });
  }

  public removeListener(listener: ClientEventListener): void {
    this.debug(`Removing listener for event ${listener.event}`);

    if (!this.listeners.has(listener.event)) {
      throw new Error(`Listener for event ${listener.event} is not registered`);
    }

    this.listeners.delete(listener.event);
  }

  public register(...commands: AnyCommand[]): void {
    const withChildren = commands.flatMap((command) => command.registry);

    withChildren.forEach((command) => {
      this.debug(`Registering command ${command.id}`);

      if (this.has(command.id)) {
        throw new Error(`Command ${command.id} is already registered`);
      }

      this.commands.set(
        command.id,
        CommandBase.buildCommand(command) as Command,
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

  public get(id: string): AnyCommand | undefined {
    this.debug(`Getting command ${id}`);

    return this.commands.get(id) as AnyCommand | undefined;
  }

  public has(id: string): boolean {
    this.debug(`Checking if command ${id} exists`);

    return this.commands.has(id);
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
  public initialize(
    client: Client<true>,
    options?: {
      omitJobs?: boolean;
      omitListeners?: boolean;
    },
  ): AbstractRESTClient {
    this.debug('Initializing command manager');

    this.REST = RESTClient.getInstance(
      client,
      this.apiCommands.map((c) => c.data.toJSON()),
    );

    client.on('interactionCreate', async (interaction) => {
      const commandIdentifier = CommandBase.commandIdentifierFor(interaction);

      this.debug(
        `Received ${interaction.isAutocomplete() ? 'autocomplete' : ''} interaction for command ${commandIdentifier}`,
      );

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

      const tryErrorReply = (message: string) => {
        if (interaction.isRepliable()) {
          return command.reply(interaction, Embeds.error(message));
        }

        if (!interaction.responded) {
          return interaction.respond([
            {
              name: StringUtils.truncate(message, 100),
              value: 'null',
            },
          ]);
        }

        return Promise.resolve();
      };

      if (typeof safeInteraction === 'string') {
        Logger.error(
          `Failed to handle interaction for command ${command.id}: ${safeInteraction}`,
        );
        await tryErrorReply(`${safeInteraction}, please try again later`);
        return;
      }

      const fn = CommandBase.runFunctionResolver(command, safeInteraction);

      if (fn === null) {
        Logger.error(
          `Command ${command.id} has no function to run, and no controller was found, ignoring`,
        );
        await tryErrorReply(
          'Something went wrong while executing this command, please try again later. This issue has been reported to the developers.',
        );
        return;
      }

      let result;
      let cmdRunStart = Date.now();
      let cmdRunEnd = Date.now();

      try {
        const [throttle, consumerResult] = await command.withThrottle(
          () => Database.Command.throttleConsumer(command, safeInteraction),
          () => {
            cmdRunStart = Date.now();

            return fn(client, safeInteraction);
          },
        );

        cmdRunEnd = Date.now();

        if (!throttle) {
          Logger.error(
            `Command ${command.id} is being throttled, refusing interaction`,
          );
          await tryErrorReply(
            `You are being rate-limited, please wait ${TimeUtils.humanReadableMs(
              consumerResult.expiresAt - Date.now(),
              2,
              () => '',
            )} before using this command again.`,
          );
          return;
        }

        result = throttle;
      } catch (error) {
        Logger.error(error);
        await tryErrorReply(
          'There was an error while executing this command, please try again later',
        );
        await Database.Command.afterCommandRun(
          command,
          safeInteraction,
          Date.now() - cmdRunStart,
          `${error}`,
        );
        return;
      }

      await Promise.all([
        InteractionUtils.isResponseContent(result) &&
        safeInteraction.isRepliable()
          ? command.reply(safeInteraction, result)
          : Promise.resolve(),
        Database.Command.afterCommandRun(
          command,
          safeInteraction,
          cmdRunEnd - cmdRunStart,
          null,
        ),
      ]);
    });

    if (!options?.omitJobs) {
      void Promise.all(this.jobs.map((job) => job.init(client)));
    }

    if (!options?.omitListeners) {
      this.listeners.forEach((listener) => listener.register(client));
    }

    return this.REST;
  }
}

export { CommandManager };
