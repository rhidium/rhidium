import { bold, Collection, Events, OAuth2Scopes } from 'discord.js';
import { AnyCommand, APICommand, Command, CommandBase } from './base';
import { debug, Debugger, Logger } from '@core/logger';
import { Embeds } from '@core/config';
import { AbstractRESTClient, NoOpRESTClient, RESTClient } from './rest';
import { InteractionUtils, StringUtils } from '@core/utils';
import { Database } from '@core/database';
import { ClientJob } from './jobs';
import { ClientEventListener } from './events';
import Client from '@core/client';
import { I18n } from '@core/i18n';

class Manager<
  Key extends string,
  Value extends { id: Key },
  CastValue = Value,
> {
  private readonly collection: Collection<Key, Value>;
  private readonly debug: Debugger;

  public constructor(
    public readonly id: string,
    public readonly options?: {
      onAdd?: (value: Value) => void;
      onRemove?: (value: Value) => void;
      onClear?: () => void;
      onGet?: (value: Value) => void;
      onHas?: (value: Value) => void;
    },
  ) {
    this.collection = new Collection();
    this.debug = debug.commands.manager.extend(id);
  }

  public add(value: Value): void {
    this.debug(`Adding ${this.id} %o`, value.id);

    if (this.collection.has(value.id)) {
      throw new Error(`${this.id} ${value.id} is already registered`);
    }

    this.collection.set(value.id, value);
    this.options?.onAdd?.(value);
  }

  public remove(value: Value): void {
    this.debug(`Removing ${this.id} %o`, value);

    if (!this.collection.has(value.id)) {
      throw new Error(`${this.id} ${value.id} is not registered`);
    }

    this.collection.delete(value.id);
    this.options?.onRemove?.(value);
  }

  public clear(): void {
    this.debug(`Clearing all ${this.id}`);

    this.collection.clear();
    this.options?.onClear?.();
  }

  public get(id: Key): CastValue | undefined {
    this.debug(`Getting ${this.id} %s`, id);

    return this.collection.get(id) as CastValue;
  }

  public has(id: Key): boolean {
    this.debug(`Checking if ${this.id} %s exists`, id);

    return this.collection.has(id);
  }

  public byFilter<U extends Value, F extends boolean>(
    ...filters: ((value: Value) => F)[]
  ): Collection<Key, U> {
    this.debug(`Getting ${this.id} by filter`);

    return this.collection.filter((value) =>
      filters.every((filter) => (filter as (value: Value) => F)(value)),
    ) as Collection<Key, U>;
  }

  public map<U>(fn: (value: Value) => U): U[] {
    this.debug(`Mapping ${this.id}`);

    return this.collection.map(fn);
  }
  public forEach(fn: (value: Value) => void): void {
    this.debug(`ForEach ${this.id}`);

    this.collection.forEach(fn);
  }
  public filter(fn: (value: Value) => boolean): Collection<Key, Value> {
    this.debug(`Filtering ${this.id}`);

    return this.collection.filter(fn);
  }
}

class ClientManager {
  public REST: AbstractRESTClient;
  private readonly debug: Debugger;
  public readonly jobs: Manager<string, ClientJob>;
  public readonly commands: Manager<string, AnyCommand, Command>;
  public readonly listeners: ClientEventListener[] = [];
  public get apiCommands(): Collection<string, APICommand> {
    this.debug('Getting API commands');
    return this.commands.byFilter(
      CommandBase.isApiCommand,
      CommandBase.isEnabled,
    );
  }

  public constructor() {
    this.commands = new Manager('command');
    this.jobs = new Manager('job');
    this.debug = debug.commands.manager;
    this.REST = new NoOpRESTClient();
  }

  public register(...components: ComponentRegistry): void {
    const commands = components.filter(
      (component): component is AnyCommand => component instanceof Command,
    );

    if (commands.length) {
      const withChildren = commands.flatMap((command) => command.registry);

      this.debug(
        'Registering commands %o',
        withChildren.map((command) => command.id),
      );

      withChildren.forEach((command) =>
        this.commands.add(CommandBase.build(command)),
      );
    }

    const jobs = components.filter(
      (component): component is ClientJob => component instanceof ClientJob,
    );

    if (jobs.length) {
      this.debug(
        'Registering jobs %o',
        jobs.map((job) => job.id),
      );

      jobs.forEach((job) => {
        this.jobs.add(job);
      });
    }

    const listeners = components.filter(
      (component): component is ClientEventListener =>
        component instanceof ClientEventListener,
    );

    if (listeners.length) {
      this.debug(
        'Registering listeners %o',
        listeners.map((listener) => listener.event),
      );

      listeners.forEach((listener) => {
        this.listeners.push(listener);
      });
    }
  }

  public unregister(component: AnyCommand | ClientJob): void {
    this.debug(`Unregistering component ${component.id}`);

    if (component instanceof ClientJob) {
      this.jobs.remove(component);
    }
    if (component instanceof Command) {
      this.commands.remove(component);
    }
  }

  public unregisterAll(): void {
    this.debug('Unregistering all commands');

    this.commands.clear();
    this.jobs.clear();
  }

  public async commandLink(
    client: Client<true>,
    name: string,
    options?: {
      subcommand?: string;
      subcommandGroup?: string;
      guildId?: string;
    },
  ): Promise<string> {
    this.debug(`Getting command link for ${name}`);

    const {
      subcommandGroup,
      subcommand,
      guildId = client.syncOptions?.guildId,
    } = options ?? {};
    const apiCommands = await this.REST.fetchApiCommands(guildId ?? null);
    const apiCommand = apiCommands.find((c) => c.name === name);

    if (!apiCommand) {
      return `**\`/${name}${
        subcommandGroup && subcommand
          ? ` ${subcommandGroup} ${subcommand}`
          : subcommandGroup
            ? ` ${subcommandGroup}`
            : subcommand
              ? ` ${subcommand}`
              : ''
      }\`**`;
    }

    return `</${name}${
      subcommandGroup && subcommand
        ? ` ${subcommandGroup} ${subcommand}`
        : subcommandGroup
          ? ` ${subcommandGroup}`
          : subcommand
            ? ` ${subcommand}`
            : ''
    }:${apiCommand.id}>`;
  }

  /** A list of unique permissions that are required by the client across all commands. */
  public get flatCommandPermissions() {
    this.debug('Getting flat command permissions');

    return Array.from(
      new Set(
        this.apiCommands
          // Note: No need to filter by enabled, as disabled implies the
          // command will be made available again at some point.
          // .filter(CommandBase.isEnabled)
          .map((command) => command.permissions.client)
          .flat(),
      ),
    );
  }

  /** A list of unique categories across all active commands. */
  public get flatCommandCategories() {
    this.debug('Getting flat command categories');

    return Array.from(
      new Set(
        this.apiCommands
          .filter(CommandBase.isEnabled)
          .map((command) => command.category)
          .filter((category): category is string => !!category?.trim()),
      ),
    );
  }

  public readonly generateInvite = (
    client: Client<true>,
    guildId?: string | null,
  ) => {
    this.debug('Generating invite link');

    return client.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: this.flatCommandPermissions,
      disableGuildSelect: !!guildId,
      guild: guildId ?? undefined,
    });
  };

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

    client.on(Events.InteractionCreate, async (interaction) => {
      const commandIdentifier = CommandBase.commandIdentifierFor(interaction);

      this.debug(
        `Received ${interaction.isAutocomplete() ? 'autocomplete ' : ''}interaction for command ${commandIdentifier}`,
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

      const tryErrorReply = (
        message:
          | string
          | {
              title: string;
              description: string;
            },
      ) => {
        if (interaction.isRepliable()) {
          return command.reply(interaction, Embeds.error(message));
        }

        if (!interaction.responded) {
          const msgStr =
            typeof message === 'string' ? message : message.description;

          return interaction.respond([
            {
              name: StringUtils.truncate(msgStr, 100),
              value: 'null',
            },
          ]);
        }

        return Promise.resolve();
      };

      if (Array.isArray(safeInteraction)) {
        const [key, context] = safeInteraction;
        Logger.error(
          `Failed to handle interaction for command ${command.id}: ${safeInteraction}`,
        );
        await tryErrorReply(I18n.localize(key, interaction, context ?? {}));
        return;
      }

      const fn = CommandBase.runFunctionResolver(command, safeInteraction);

      if (fn === null) {
        Logger.error(
          `Command ${command.id} has no function to run, and no controller was found, ignoring`,
        );
        await tryErrorReply(I18n.genericErrorDecline(interaction));
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

            return fn({ client, interaction: safeInteraction });
          },
        );

        cmdRunEnd = Date.now();

        if (!throttle) {
          Logger.error(
            `Command ${command.id} is being throttled, refusing interaction`,
          );
          await tryErrorReply({
            title: I18n.localize('common:errors.rateLimit.title', interaction),
            description: I18n.localize(
              'common:errors.rateLimit.message',
              interaction,
              {
                time: bold(
                  I18n.localize(
                    I18n.timeKey(consumerResult.expiresAt - Date.now()),
                    interaction,
                  ),
                ),
              },
            ),
          });
          return;
        }

        result = throttle;
      } catch (error) {
        Logger.error(error);
        await tryErrorReply(I18n.genericErrorDecline(interaction));
        if (!interaction.isAutocomplete()) {
          await Database.Command.afterCommandRun(
            command,
            safeInteraction,
            Date.now() - cmdRunStart,
            `${error}`,
          );
        }
        return;
      }

      await Promise.all([
        InteractionUtils.isResponseContent(result) &&
        safeInteraction.isRepliable()
          ? command.reply(safeInteraction, result)
          : Promise.resolve(),
        interaction.isAutocomplete()
          ? Promise.resolve()
          : Database.Command.afterCommandRun(
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
      this.listeners.forEach((listener) => {
        listener.register(client);
        if (listener.event === Events.ClientReady) {
          (listener as ClientEventListener<Events.ClientReady>).run(client);
        }
      });
    }

    return this.REST;
  }
}

type AnyComponent = AnyCommand | ClientJob | ClientEventListener;
type ComponentRegistry = AnyComponent[];

export { ClientManager, type AnyComponent, type ComponentRegistry };
