import _debug, { type Debugger as _Debugger } from 'debug';
import { ApplicationCommandType } from 'discord.js';

const debug = _debug('app');

const commands = debug.extend('commands');
const permissions = debug.extend('permissions');
const events = debug.extend('events');
const cache = debug.extend('cache');
const database = debug.extend('database');
const utils = debug.extend('utils');

export default {
  debug,
  commands: {
    manager: commands.extend('manager'),
    rest: commands.extend('rest'),
    [ApplicationCommandType.ChatInput]: commands.extend('chat'),
    [ApplicationCommandType.Message]: commands.extend('message'),
    [ApplicationCommandType.User]: commands.extend('user'),
    [ApplicationCommandType.PrimaryEntryPoint]: commands.extend('entry'),
  },
  permissions,
  events,
  cache,
  database,
  utils,
};

export type Debugger = _Debugger;
