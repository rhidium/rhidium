import { Database } from '@core/database';
import { debug, Debugger, Logger } from '@core/logger';
import { ObjectUtils } from '@core/utils';
import {
  ApplicationCommand,
  Collection,
  GuildResolvable,
  REST,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
  Routes,
} from 'discord.js';
import { CommandBase } from './base';
import Client from '@core/client';

type APICommandData =
  | RESTPostAPIChatInputApplicationCommandsJSONBody
  | RESTPostAPIContextMenuApplicationCommandsJSONBody;

type CommandCheckResponse = {
  isSynced: boolean;
  new: string[];
  updated: string[];
  deleted: string[];
};

type SyncCommandOptions = {
  /**
   * The guild ID to sync commands for, or `null` for global
   */
  guildId?: string | null;
  /**
   * Whether to clear commands from the other environment. If `guildId` is provided,
   * this will clear global commands, and vice versa
   */
  clearOtherEnvironment?: boolean;
  /**
   * Whether to force sync commands, even if they are already in sync. Useful
   * if you run multiple code bases on the same (development) bot (user) account.
   */
  forceSync?: boolean;
};

type AbstractRESTClient = {
  /**
   * Data for all commands that the `client` has registered
   */
  data: APICommandData[];
  /**
   * Checks if local commands are in sync with the database & Discord API
   * @param guildId The guild ID to check commands for, or `null` for global
   * @returns A response object with the sync status, consisting of new, updated, and deleted commands
   */
  checkCommandsSynced: (
    guildId: string | null,
  ) => Promise<CommandCheckResponse>;
  /**
   * Syncs the local commands to the database
   * @param guildId The guild ID to sync commands for, or `null` for global
   * @param commandData The command data to sync
   * @param diff The diff response from `checkCommandsSynced`
   * @returns A promise that resolves when the commands are synced
   */
  syncCommandsToDatabase: (
    guildId: string | null,
    commandData: APICommandData[],
    diff: CommandCheckResponse,
  ) => Promise<void>;
  /**
   * Clears commands from the Discord API
   * @param guildId The guild ID to clear commands for, or `null` for global
   * @returns A promise that resolves when the commands are cleared
   */
  clearCommands: (guildId?: string | null) => Promise<void>;
  /**
   * Syncs commands to the Discord API and our database. An API call is only
   * made if there are new, updated, or deleted commands.
   * @param options The options to sync commands with
   * @returns A promise that resolves when the commands are synced
   */
  syncCommands: (options?: SyncCommandOptions) => Promise<void>;
  /**
   * Fetches commands from the Discord API
   * @param guildId The guild ID to fetch commands for, or `null` for global
   * @returns A promise that resolves with the command data
   */
  fetchApiCommands: (
    guildId: string | null,
  ) => Promise<
    Collection<string, ApplicationCommand<{ guild: GuildResolvable }>>
  >;
};

const noOpMessage =
  'Rest client not initialized, use after ClientManager#initialize';

class NoOpRESTClient implements AbstractRESTClient {
  public data: APICommandData[] = [];
  private readonly error = new Error(noOpMessage);

  public async checkCommandsSynced(): Promise<CommandCheckResponse> {
    throw this.error;
  }

  public async syncCommandsToDatabase(): Promise<void> {
    throw this.error;
  }

  public async clearCommands(): Promise<void> {
    throw this.error;
  }

  public async syncCommands(): Promise<void> {
    throw this.error;
  }

  public async fetchApiCommands(): Promise<
    Collection<string, ApplicationCommand<{ guild: GuildResolvable }>>
  > {
    throw this.error;
  }
}

class RESTClient implements AbstractRESTClient {
  public data: APICommandData[];
  private readonly debug: Debugger;
  private static _instance: RESTClient | null;

  private readonly client: Client<true>;
  private readonly REST: REST;

  private constructor(client: Client<true>, apiCommands: APICommandData[]) {
    this.client = client;
    this.REST = new REST({ version: '10' }).setToken(this.client.token);
    this.debug = debug.commands.rest;
    this.data = apiCommands;
  }

  public static getInstance(
    client: Client<true>,
    apiCommands: APICommandData[],
  ) {
    if (!this._instance) {
      this._instance = new RESTClient(client, apiCommands);
    }

    return this._instance;
  }

  public async checkCommandsSynced(
    guildId: string | null,
  ): Promise<CommandCheckResponse> {
    const commandApiIds = this.data.map((command) =>
      CommandBase.resolveId(command),
    );

    const dbCommands = await Database.Command.findMany({
      where: {
        id: {
          in: commandApiIds,
        },
        GuildId: guildId,
      },
    });

    const dbCommandIds = dbCommands.map((command) => command.id);

    const newCommands = commandApiIds.filter(
      (id) => !dbCommandIds.includes(id),
    );

    const updatedCommands = dbCommandIds.filter((id) => {
      const original = dbCommands.find((command) => command.id === id);
      const updated = CommandBase.findInApiData(id, this.data);

      if (!original || !updated || typeof original.data !== 'string') {
        return false;
      }

      const diff = ObjectUtils.diffAsChanges(
        JSON.parse(original.data),
        JSON.parse(JSON.stringify(updated)),
      );

      if (diff.length > 0) {
        this.debug('Command %s has changes: %o', id);
        diff.forEach((change) => {
          this.debug(
            'Change: %s: %o -> %o',
            change.path.join('.'),
            change.previousValue,
            change.newValue,
          );
        });
      }

      return diff.length > 0;
    });

    const deletedCommands = dbCommandIds.filter(
      (id) => !commandApiIds.includes(id),
    );

    return {
      isSynced:
        newCommands.length === 0 &&
        updatedCommands.length === 0 &&
        deletedCommands.length === 0,
      new: newCommands,
      updated: updatedCommands,
      deleted: deletedCommands,
    };
  }

  public readonly syncCommandsToDatabase = async (
    guildId: string | null,
    commandData: APICommandData[],
    diff: CommandCheckResponse,
  ): Promise<void> => {
    this.debug('Syncing commands to database');

    if (diff.isSynced) {
      this.debug('Commands are already synced in database, skipping');
      return;
    }

    if (guildId) {
      await Database.Guild.resolve(guildId);
    }

    const resolvedNew = diff.new
      .map((id) => CommandBase.findInApiData(id, commandData) ?? null)
      .filter((command) => command !== null);
    const resolvedUpdated = diff.updated
      .map((id) => CommandBase.findInApiData(id, commandData) ?? null)
      .filter((command) => command !== null);
    const resolvedDeleted = diff.deleted
      .map((id) => CommandBase.findInApiData(id, commandData) ?? null)
      .filter((command) => command !== null);

    if (resolvedNew.length > 0) {
      this.debug(
        'Adding new commands to database: %o',
        resolvedNew.map((c) => c.name),
      );
      await Promise.all(
        resolvedNew.map(async (command) => {
          await Database.Command.create({
            id: CommandBase.resolveId(command),
            GuildId: guildId,
            data: JSON.stringify(command),
          });
        }),
      );
    }

    if (resolvedUpdated.length > 0) {
      this.debug(
        'Updating existing commands in database: %o',
        resolvedUpdated.map((c) => c.name),
      );
      await Promise.all(
        resolvedUpdated.map(async (command) => {
          const original = await Database.Command.findFirst({
            where: {
              id: CommandBase.resolveId(command),
              GuildId: guildId,
            },
          });

          if (!original) {
            return;
          }

          await Database.Command.update({
            where: {
              id: CommandBase.resolveId(command),
              GuildId: guildId,
            },
            data: {
              data: JSON.stringify(command),
            },
          });
        }),
      );
    }

    if (resolvedDeleted.length > 0) {
      this.debug(
        'Deleting commands from database: %o',
        resolvedDeleted.map((c) => c.name),
      );
      await Database.Command.deleteMany({
        id: {
          in: resolvedDeleted.map((command) => command.name),
        },
      });
    }

    const staleCommands = await Database.Command.findMany({
      where: {
        NOT: {
          id: {
            // Note: commandData can be a subset of this.data, use global/this data
            in: this.data.map((command) => CommandBase.resolveId(command)),
          },
        },
        GuildId: guildId,
      },
    });

    if (staleCommands.length > 0) {
      this.debug(
        'Deleting stale commands from database: %o',
        staleCommands.map((c) => c.id),
      );
      await Database.Command.deleteMany({
        id: {
          in: staleCommands.map((command) => command.id),
        },
      });
    }

    this.debug('Commands synced to database');
  };

  public async clearCommands(guildId?: string | null): Promise<void> {
    this.debug(
      `Clearing commands for ${guildId ? `guild ${guildId}` : 'global'}`,
    );

    if (guildId) {
      if (!(await this.client.guilds.fetch(guildId).catch(() => null))) {
        Logger.warn(`Guild ${guildId} not found, skipping command clear`);
        return;
      }

      await this.REST.put(
        Routes.applicationGuildCommands(this.client.application.id, guildId),
        {
          body: [],
        },
      );
    } else {
      await this.REST.put(
        Routes.applicationCommands(this.client.application.id),
        {
          body: [],
        },
      );
    }
  }

  public async fetchApiCommands(guildId: string | null) {
    this.debug(
      `Fetching commands for ${guildId ? `guild ${guildId}` : 'global'}`,
    );

    if (guildId) {
      if (!(await this.client.guilds.fetch(guildId).catch(() => null))) {
        Logger.warn(`Guild ${guildId} not found, skipping command fetch`);
        return new Collection<
          string,
          ApplicationCommand<{ guild: GuildResolvable }>
        >();
      }
    }

    return this.client.application.commands.fetch({
      guildId: guildId ?? undefined,
    });
  }

  public async syncCommands(options?: SyncCommandOptions): Promise<void> {
    this.debug('Syncing commands');

    const { guildId, clearOtherEnvironment, forceSync } = options ?? {};

    const [synced, apiCommands] = await Promise.all([
      this.checkCommandsSynced(guildId ?? null),
      this.fetchApiCommands(guildId ?? null),
    ]);

    const environmentIsDesynced = Array.isArray(apiCommands)
      ? apiCommands.length !== this.data.length
      : true;

    if (synced.isSynced && !forceSync && !environmentIsDesynced) {
      this.debug('Commands are already in sync, skipping');
      return;
    }

    if (environmentIsDesynced) {
      this.debug(
        'Environment API data is desynced, syncing commands to Discord API',
        {
          guildId,
          forceSync,
          apiCommandsIsArray: Array.isArray(apiCommands),
          apiCommandsLength: Array.isArray(apiCommands)
            ? apiCommands.length
            : null,
          dataLength: this.data.length,
        },
      );
    }

    const putCommandData =
      forceSync || environmentIsDesynced
        ? this.data
        : this.data.filter(
            (command) =>
              synced.new.includes(CommandBase.resolveId(command)) ||
              synced.updated.includes(CommandBase.resolveId(command)),
          );

    const deleteCommandData =
      forceSync || environmentIsDesynced
        ? []
        : synced.deleted
            .map((id) => CommandBase.findInApiData(id, this.data) ?? null)
            .filter((command) => command !== null);

    this.debug(
      'Commands to put: %o',
      putCommandData.map((c) => CommandBase.resolveId(c)),
    );
    this.debug(
      'Commands to delete: %o',
      deleteCommandData.map((c) => CommandBase.resolveId(c)),
    );

    if (guildId) {
      if (!(await this.client.guilds.fetch(guildId).catch(() => null))) {
        Logger.warn(`Guild ${guildId} not found, skipping command sync`);
        return;
      }

      this.debug('Syncing commands to guild %s', guildId);
      await Promise.all([
        this.syncCommandsToDatabase(guildId, putCommandData, synced),
        this.REST.put(
          Routes.applicationGuildCommands(this.client.application.id, guildId),
          {
            body: putCommandData,
          },
        ),
        deleteCommandData.length > 0
          ? this.REST.delete(
              Routes.applicationGuildCommands(
                this.client.application.id,
                guildId,
              ),
              {
                body: deleteCommandData,
              },
            )
          : Promise.resolve(),
        clearOtherEnvironment ? this.clearCommands(null) : Promise.resolve(),
      ]);
    } else {
      this.debug('Syncing commands globally');
      await Promise.all([
        this.syncCommandsToDatabase(null, putCommandData, synced),
        this.REST.put(Routes.applicationCommands(this.client.application.id), {
          body: putCommandData,
        }),
        deleteCommandData.length > 0
          ? this.REST.delete(
              Routes.applicationCommands(this.client.application.id),
              {
                body: deleteCommandData,
              },
            )
          : Promise.resolve(),
        clearOtherEnvironment && guildId
          ? this.clearCommands(guildId)
          : Promise.resolve(),
      ]);
    }

    this.debug('Commands synced');
  }
}

export {
  RESTClient,
  NoOpRESTClient,
  type AbstractRESTClient,
  type APICommandData,
  type CommandCheckResponse,
  type SyncCommandOptions,
};
