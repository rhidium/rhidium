import { Database } from '@client/database';
import debug, { Debugger } from '@client/debug';
import { Logger } from '@client/logger';
import { ObjectUtils } from '@client/utils';
import {
  Client,
  REST,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
  Routes,
} from 'discord.js';

type APICommandData =
  | RESTPostAPIChatInputApplicationCommandsJSONBody
  | RESTPostAPIContextMenuApplicationCommandsJSONBody;

type CommandCheckResponse = {
  isSynced: boolean;
  new: string[];
  updated: string[];
  deleted: string[];
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
   * @param diff The diff response from {@link AbstractRESTClient.checkCommandsSynced our check}
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
   * @param guildId The guild ID to sync commands for, or `null` for global
   * @param clearOtherEnvironment Whether to clear commands from the other environment. If
   *   `guildId` is provided, this will clear global commands, and vice versa
   * @param forceSync Whether to force sync commands, even if they are already in sync. Useful
   *   if you run multiple code bases on the same (development) bot (user) account.
   * @returns A promise that resolves when the commands are synced
   */
  syncCommands: (
    guildId?: string | null,
    clearOtherEnvironment?: boolean,
    forceSync?: boolean,
  ) => Promise<void>;
};

const noOpMessage =
  'Rest client not initialized, use after CommandManager#initialize';

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
      Database.Command.resolveId(command),
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
      const updated = Database.Command.findInApiData(id, this.data);

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
      this.debug('Commands are already in sync, skipping');
      return;
    }

    const resolvedNew = diff.new
      .map((id) => Database.Command.findInApiData(id, commandData) ?? null)
      .filter((command) => command !== null);
    const resolvedUpdated = diff.updated
      .map((id) => Database.Command.findInApiData(id, commandData) ?? null)
      .filter((command) => command !== null);
    const resolvedDeleted = diff.deleted
      .map((id) => Database.Command.findInApiData(id, commandData) ?? null)
      .filter((command) => command !== null);

    if (resolvedNew.length > 0) {
      this.debug(
        'Adding new commands to database: %o',
        resolvedNew.map((c) => c.name),
      );
      await Promise.all(
        resolvedNew.map(async (command) => {
          await Database.Command.create({
            id: Database.Command.resolveId(command),
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
              id: Database.Command.resolveId(command),
              GuildId: guildId,
            },
          });

          if (!original) {
            return;
          }

          await Database.Command.update({
            where: {
              id: Database.Command.resolveId(command),
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
            in: this.data.map((command) => Database.Command.resolveId(command)),
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

  public async syncCommands(
    guildId?: string | null,
    clearOtherEnvironment = false,
    forceSync = false,
  ): Promise<void> {
    this.debug('Syncing commands');

    const synced = await this.checkCommandsSynced(guildId ?? null);

    if (synced.isSynced && !forceSync) {
      this.debug('Commands are already in sync, skipping');
      return;
    }

    const putCommandData = forceSync
      ? this.data
      : this.data.filter(
          (command) =>
            synced.new.includes(Database.Command.resolveId(command)) ||
            synced.updated.includes(Database.Command.resolveId(command)),
        );

    const deleteCommandData = forceSync
      ? []
      : synced.deleted
          .map((id) => Database.Command.findInApiData(id, this.data) ?? null)
          .filter((command) => command !== null);

    this.debug(
      'Commands to put: %o',
      putCommandData.map((c) => Database.Command.resolveId(c)),
    );
    this.debug(
      'Commands to delete: %o',
      deleteCommandData.map((c) => Database.Command.resolveId(c)),
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
};
