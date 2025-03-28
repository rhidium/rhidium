import _debug, { type Debugger as _Debugger } from 'debug';

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
    ChatInput: commands.extend('chat'),
    UserContextMenu: commands.extend('message'),
    MessageContextMenu: commands.extend('user'),
    PrimaryEntryPoint: commands.extend('entry'),
    Button: commands.extend('button'),
    StringSelect: commands.extend('string'),
    UserSelect: commands.extend('userselect'),
    RoleSelect: commands.extend('roleselect'),
    MentionableSelect: commands.extend('mentionableselect'),
    ChannelSelect: commands.extend('channelselect'),
    ModalSubmit: commands.extend('modal'),
  },
  permissions,
  events,
  cache,
  database,
  utils,
};

export type Debugger = _Debugger;
