import _debug, { type Debugger as _Debugger } from 'debug';

const debugLib = _debug('app');

const commands = debugLib.extend('commands');
const permissions = debugLib.extend('permissions');
const events = debugLib.extend('events');
const cache = debugLib.extend('cache');
const database = debugLib.extend('database');
const utils = debugLib.extend('utils');

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
