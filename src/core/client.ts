import {
  Client as DiscordClient,
  ClientOptions as DiscordClientOptions,
  Events,
} from 'discord.js';
import { ClientManager } from './commands';
import { i18n } from 'i18next';
import { SyncCommandOptions } from './commands/rest';

type ClientOptions = {
  manager: ClientManager;
  Lang: i18n;
};

class Client<Ready extends boolean = false>
  extends DiscordClient<Ready>
  implements ClientOptions
{
  public readonly manager: ClientManager;
  public readonly Lang: i18n;

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

    super.once(Events.ClientReady, () => {
      void this.manager
        .initialize(this as Client<true>)
        .syncCommands(syncOptions);
    });

    return promise;
  };
}

export default Client;
