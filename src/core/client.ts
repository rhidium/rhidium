import {
  Client as DiscordClient,
  ClientOptions as DiscordClientOptions,
  Events,
} from 'discord.js';
import { ClientManager, CommandBase } from './commands';
import { i18n } from 'i18next';
import { SyncCommandOptions } from './commands/rest';

type ClientOptions = {
  manager: ClientManager;
  Lang: i18n;
};

class Client<Ready extends boolean = boolean>
  extends DiscordClient<Ready>
  implements ClientOptions
{
  public readonly manager: ClientManager;
  public readonly Lang: i18n;
  public syncOptions: SyncCommandOptions | undefined;

  constructor(options: DiscordClientOptions & ClientOptions) {
    super(options);
    this.manager = options.manager;
    this.Lang = options.Lang;
  }

  public override readonly login = (
    token: string | undefined,
    syncOptions?: SyncCommandOptions,
  ): Promise<string> => {
    const promise = super.login(token);
    this.syncOptions = syncOptions;

    super.once(Events.ClientReady, () => {
      void this.manager
        .initialize(this as Client<true>)
        .syncCommands(
          this.manager.commands.byFilter(CommandBase.isNonApiCommand),
          syncOptions,
        );
    });

    return promise;
  };
}

export default Client;
