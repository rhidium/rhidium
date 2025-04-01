import { ComponentRegistry } from '@core/commands';
import ProcessCommandUsageJob from './jobs/process-command-usage';
import ClientReady from './listeners/ready';
import SettingsUpdateCommand from './buttons/settings-update';
import SettingsCommand from './chat-input/settings';
import GuildMemberAdd from './listeners/guild/guild-member-add';
import GuildMemberRemove from './listeners/guild/guild-member-remove';
import PrintEmbedsCommand from './message-context/print-embeds';
import SettingsCategoryCommand from './select-menus/settings-category';

const systemRegistry = [
  SettingsUpdateCommand,
  SettingsCommand,
  ClientReady,
  ProcessCommandUsageJob,
  GuildMemberAdd,
  GuildMemberRemove,
  PrintEmbedsCommand,
  SettingsCategoryCommand,
] as ComponentRegistry;

export default systemRegistry;
