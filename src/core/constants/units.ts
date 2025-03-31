export class UnitConstants {
  // Size - Bytes
  static readonly BYTES_IN_KIB = 1024;
  static readonly BYTES_IN_MIB = 1048576;
  static readonly BYTES_IN_GIB =
    UnitConstants.BYTES_IN_MIB * UnitConstants.BYTES_IN_KIB;

  // Time - Milliseconds
  static readonly NS_IN_ONE_MS = 1000000;
  static readonly NS_IN_ONE_SECOND = 1e9;
  static readonly MS_IN_ONE_SECOND = 1000;
  static readonly MS_IN_ONE_MINUTE = 60000;
  static readonly MS_IN_ONE_HOUR = 3600000;
  static readonly MS_IN_ONE_DAY = 864e5;
  static readonly MS_IN_ONE_WEEK = this.MS_IN_ONE_DAY * 7;

  // Time - Seconds
  static readonly SECONDS_IN_ONE_MINUTE = 60;
  static readonly SECONDS_IN_ONE_HOUR = 3600;
  static readonly SECONDS_IN_ONE_DAY = 86400;
  static readonly SECONDS_IN_ONE_WEEK = this.SECONDS_IN_ONE_DAY * 7;

  // Time - Minutes
  static readonly MINUTES_IN_ONE_HOUR = 60;
  static readonly MINUTES_IN_ONE_DAY = 1440;
  static readonly MINUTES_IN_ONE_WEEK = this.MINUTES_IN_ONE_DAY * 7;

  // Time - Hours
  static readonly HOURS_IN_ONE_DAY = 24;
  static readonly HOURS_IN_ONE_WEEK = this.HOURS_IN_ONE_DAY * 7;

  // Time - Days
  static readonly DAYS_IN_ONE_WEEK = 7;
}
