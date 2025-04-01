import { ComponentRegistry } from '@core/commands';
import ReminderAutoComplete from './autocompletes/reminder';
import TimezoneAutocomplete from './autocompletes/timezone';
import RemindersCommand from './chat-input/reminders';
import TimestampCommand from './chat-input/timestamp';
import ClientReady from './listeners/ready';

const utilityRegistry = [
  ReminderAutoComplete,
  TimezoneAutocomplete,
  RemindersCommand,
  TimestampCommand,
  ClientReady,
] as ComponentRegistry;

export default utilityRegistry;
