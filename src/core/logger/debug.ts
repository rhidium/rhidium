import _debug, { type Debugger as _Debugger } from 'debug';

const debuggr = _debug('app');

const commands = debuggr.extend('commands');
const permissions = debuggr.extend('permissions');
const events = debuggr.extend('events');
const cache = debuggr.extend('cache');
const database = debuggr.extend('database');
const utils = debuggr.extend('utils');

export const debug = {
  commands: {
    jobs: commands.extend('jobs'),
    listeners: commands.extend('listeners'),
    manager: commands.extend('manager'),
    rest: commands.extend('rest'),
    ChatInput: commands.extend('chatinput'),
    ChatInputPlain: commands.extend('chatinputplain'),
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
    AutoComplete: commands.extend('autocomplete'),
  },
  permissions,
  events,
  cache,
  database,
  utils,
};

export type Debugger = _Debugger;
