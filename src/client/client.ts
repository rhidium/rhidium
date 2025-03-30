import {
  Client as DiscordClient,
  ClientOptions as DiscordClientOptions,
} from 'discord.js';
import { CommandManager } from './commands';
import { i18n } from 'i18next';

type ClientOptions = {
  manager: CommandManager;
  Lang: i18n;
};

class Client<Ready extends boolean = false>
  extends DiscordClient<Ready>
  implements ClientOptions
{
  public readonly manager: CommandManager;
  public readonly Lang: i18n;

  constructor(options: DiscordClientOptions & ClientOptions) {
    super(options);
    this.manager = options.manager;
    this.Lang = options.Lang;
  }
}

export default Client;
