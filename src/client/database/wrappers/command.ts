import { Command } from '@client/commands';
import { Model } from '../models';
import { DatabaseWrapper } from './wrapper';
import {
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';

class CommandWrapper extends DatabaseWrapper<Model.Command> {
  constructor() {
    super(Model.Command);
  }

  public readonly resolveId = (
    cmd:
      | Command
      | RESTPostAPIChatInputApplicationCommandsJSONBody
      | RESTPostAPIContextMenuApplicationCommandsJSONBody,
  ) => {
    if (!('data' in cmd)) {
      return `${cmd.type}/${cmd.name}`;
    }

    return `${cmd.type}/${cmd.data.name}`;
  };

  public readonly findInApiData = (
    id: string,
    data: (
      | RESTPostAPIChatInputApplicationCommandsJSONBody
      | RESTPostAPIContextMenuApplicationCommandsJSONBody
    )[],
  ) => {
    return data.find((cmd) => this.resolveId(cmd) === id);
  };
}

const commandWrapper = new CommandWrapper();

export { commandWrapper };
