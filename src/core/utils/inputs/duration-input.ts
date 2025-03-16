import { UnitConstants } from '../../constants';

class DurationInput {
  /**
   * Regular expression to match time units
   */
  static readonly regex =
    /(\d+)\s*(d|day|days|h|hour|hours|m|minute|minutes|s|second|seconds)/gi;

  /**
   * Supported time units in milliseconds
   */
  static readonly timeUnits: Record<string, number> = {
    d: UnitConstants.MS_IN_ONE_DAY,
    h: UnitConstants.MS_IN_ONE_HOUR,
    m: UnitConstants.MS_IN_ONE_MINUTE,
    s: UnitConstants.MS_IN_ONE_SECOND,
  };

  /**
   * Resolves human input (user prompts) to milliseconds
   *
   * Supported formats (please note that spaces are ignored):
   * - Full: `1 day, 2 hours, 15 minutes, and 30 seconds`
   * - Short: `1d, 2h, 15m, 30s`
   * - Mixed: `1 day,2h,15m,30s`
   * @param input The human input string
   * @returns The time in milliseconds
   */
  static readonly inputToMs = (input: string): number => {
    let match;
    let totalMs = 0;

    while ((match = this.regex.exec(input.replace(/\s+/g, ''))) !== null) {
      const value = match[1] ? parseInt(match[1], 10) : undefined;
      const unit = match[2] ? match[2][0] : undefined;
      const timeUnit = unit ? this.timeUnits[unit] : undefined;

      if (typeof value !== 'undefined' && !isNaN(value) && timeUnit) {
        totalMs += value * timeUnit;
      }
    }

    return totalMs;
  };
}

export { DurationInput };
