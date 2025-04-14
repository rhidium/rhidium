import { ComponentRegistry } from '@core/commands';
import AutoModerationAutoComplete from './auto-completes/auto-moderation-action';
import WarningAutoComplete from './auto-completes/warning';
import AutoModerationCommand from './chat-input/auto-moderation';
import PurgeCommand from './chat-input/purge';
import SeverityCommand from './chat-input/severity';
import WarnModalCommand from './modals/warn';
import WarnCommand from './chat-input/warn';
import UserInfoContextMenu from './user-context-menus/user-info';
import WarnContextMenu from './user-context-menus/warn';

const moderationRegistry = [
  AutoModerationAutoComplete,
  WarningAutoComplete,
  AutoModerationCommand,
  PurgeCommand,
  SeverityCommand,
  WarnCommand,
  WarnModalCommand,
  UserInfoContextMenu,
  WarnContextMenu,
] as unknown as ComponentRegistry;

export default moderationRegistry;
