import path from 'path';
import { CommandManagerCommandsOptions } from '@core';
import { processUsageStatisticsMiddleware } from './middleware/process-usage-statistics';
import { persistentCooldownMiddleware } from './middleware/persistent-cooldown';

export default {
  autoCompletes: [path.resolve(__dirname, './auto-completes')],
  chatInputs: [path.resolve(__dirname, './chat-input')],
  jobs: [path.resolve(__dirname, './jobs')],
  listeners: [path.resolve(__dirname, './listeners')],
  messageContextMenus: [path.resolve(__dirname, './message-context')],
  userContextMenus: [path.resolve(__dirname, './user-context')],
  componentCommands: [
    path.resolve(__dirname, './buttons'),
    path.resolve(__dirname, './modals'),
    path.resolve(__dirname, './select-menus'),
  ],
  middleware: {
    postRunExecution: [processUsageStatisticsMiddleware],
    preRunThrottle: [persistentCooldownMiddleware],
  },
} as CommandManagerCommandsOptions;
