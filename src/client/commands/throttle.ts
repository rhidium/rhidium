enum CommandThrottleType {
  User = 0,
  Member = 1,
  Guild = 2,
  Channel = 3,
  Global = 4,
}

type CommandThrottleOptions = {
  type: CommandThrottleType;
  limit: number;
  duration: number;
};

export { CommandThrottleType, type CommandThrottleOptions };
