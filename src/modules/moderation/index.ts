import { CommandManagerCommandsOptions } from '@core';
import path from 'path';

export default {
  autoCompletes: [path.resolve(__dirname, './auto-completes')],
  chatInputs: [path.resolve(__dirname, './chat-input')],
  userContextMenus: [path.resolve(__dirname, './user-context-menus')],
  componentCommands: [path.resolve(__dirname, './modals')],
} as CommandManagerCommandsOptions;
