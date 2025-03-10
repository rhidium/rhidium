import enClient from '../../../locales/en/client.json';
import enCommands from '../../../locales/en/commands.json';
import enGeneral from '../../../locales/en/general.json';
import enLib from '../../../locales/en/lib.json';

interface Resources {
  general: typeof enGeneral;
  client: typeof enClient;
  commands: typeof enCommands;
  lib: typeof enLib;
}

export default Resources;
