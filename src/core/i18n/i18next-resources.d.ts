import enClient from '../../../locales/en/client.json';
import enCommands from '../../../locales/en/commands.json';
import enGeneral from '../../../locales/en/general.json';
import enLib from '../../../locales/en/core.json';

interface Resources {
  general: typeof enGeneral;
  client: typeof enClient;
  commands: typeof enCommands;
  core: typeof enLib;
}

export default Resources;
