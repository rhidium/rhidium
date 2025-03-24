import { CommandManagerCommandsOptions } from '@core';
import path from 'path';

export default {
  autoCompletes: [path.resolve(__dirname, './auto-completes')],
  chatInputs: [path.resolve(__dirname, './chat-input')],
} as CommandManagerCommandsOptions;
