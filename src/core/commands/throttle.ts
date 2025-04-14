enum CommandThrottleType {
  User = 0,
  Member = 1,
  Guild = 2,
  Channel = 3,
  Global = 4,
}

type CommandThrottleOptions = {
  enabled: boolean;
  type: CommandThrottleType;
  limit: number;
  duration: number;
};

class CommandThrottle {
  public enabled: boolean;
  public type: CommandThrottleType;
  public limit: number;
  public duration: number;

  static readonly resolveThrottleTypeName = (
    type: CommandThrottleType,
  ): string => {
    switch (type) {
      case CommandThrottleType.User:
        return 'User';
      case CommandThrottleType.Member:
        return 'Member';
      case CommandThrottleType.Guild:
        return 'Guild';
      case CommandThrottleType.Channel:
        return 'Channel';
      case CommandThrottleType.Global:
        return 'Global';
    }
  };

  public constructor(options: Partial<CommandThrottleOptions>) {
    this.enabled = options.enabled ?? false;
    this.type = options.type ?? CommandThrottleType.User;
    this.limit = options.limit ?? 1;
    this.duration = options.duration ?? 0;
  }

  public setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    return this;
  }

  public setType(type: CommandThrottleType): this {
    this.type = type;
    return this;
  }

  public setLimit(limit: number): this {
    this.limit = limit;
    return this;
  }

  public setDuration(duration: number): this {
    this.duration = duration;
    return this;
  }

  public get isEnabled() {
    return this.enabled;
  }
  public get isUser() {
    return this.type === CommandThrottleType.User;
  }
  public get isMember() {
    return this.type === CommandThrottleType.Member;
  }
  public get isGuild() {
    return this.type === CommandThrottleType.Guild;
  }
  public get isChannel() {
    return this.type === CommandThrottleType.Channel;
  }
  public get isGlobal() {
    return this.type === CommandThrottleType.Global;
  }
}

export { CommandThrottle, CommandThrottleType, type CommandThrottleOptions };
