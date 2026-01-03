import { type ComponentRegistry } from '@core/commands';
import CommandOrCategoryCommand from './auto-completes/command-or-category';
import EvalAcceptCommand from './buttons/eval-accept';
import EvalDeclineCommand from './buttons/eval-decline';
import SettingsUpdateCommand from './buttons/settings-update';
import SettingsCommand from './chat-input/administrator/settings';
import ChangeAvatarCommand from './chat-input/developer/change-avatar';
import ChangeNameCommand from './chat-input/developer/change-name';
import ChangePresenceCommand from './chat-input/developer/change-presence';
import DatabaseMetricsCommand from './chat-input/developer/database-metrics';
import EvalCommand from './chat-input/developer/eval';
import ExecCommand from './chat-input/developer/exec';
import HelpCommand from './chat-input/system/help';
import InviteCommand from './chat-input/system/invite';
import PermLevelCommand from './chat-input/system/perm-level';
import StatsCommand from './chat-input/system/stats';
import SupportCommand from './chat-input/system/support';
import ProcessCommandUsageJob from './jobs/process-command-usage';
import GuildMemberAdd from './listeners/guild/guild-member-add';
import GuildMemberRemove from './listeners/guild/guild-member-remove';
import ClientReady from './listeners/ready';
import PrintEmbedsCommand from './message-context/print-embeds';
import CodeModalCommand from './modals/eval-modal';
import SettingsCategoryCommand from './select-menus/settings-category';

const systemRegistry = [
  CommandOrCategoryCommand,
  EvalAcceptCommand,
  EvalDeclineCommand,
  SettingsUpdateCommand,
  SettingsCommand,
  ChangeAvatarCommand,
  ChangeNameCommand,
  ChangePresenceCommand,
  DatabaseMetricsCommand,
  EvalCommand,
  ExecCommand,
  HelpCommand,
  InviteCommand,
  PermLevelCommand,
  StatsCommand,
  SupportCommand,
  ClientReady,
  ProcessCommandUsageJob,
  GuildMemberAdd,
  GuildMemberRemove,
  PrintEmbedsCommand,
  CodeModalCommand,
  SettingsCategoryCommand,
] as ComponentRegistry;

export default systemRegistry;
