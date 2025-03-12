export class PortConstants {
  static readonly WELL_KNOWN_PORT_RANGE = 1024;
  static readonly VALID_PORT_RANGE_MAX = 65535;
  static readonly EPHEMERAL_PORT_RANGE_START = 49152;
  static readonly EPHEMERAL_PORT_RANGE_END = PortConstants.VALID_PORT_RANGE_MAX;
}
