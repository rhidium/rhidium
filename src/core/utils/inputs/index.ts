import { ConfirmationInput } from './confirmation';
import { DateTimeInput } from './date-time-input';
import { DurationInput } from './duration-input';

export type * from './confirmation';
export type * from './date-time-input';
export type * from './duration-input';

export class InputUtils {
  static readonly Confirmation = ConfirmationInput;
  static readonly DateTime = DateTimeInput;
  static readonly Duration = DurationInput;
}
