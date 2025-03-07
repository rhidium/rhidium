import { Client } from 'lib/client';
import { ClientEvents } from 'discord.js';

export interface ClientEventListenerOptions<K extends keyof ClientEvents> {
  /** Should we only listen for this event once? */
  once?: boolean;
  /** The event to listen for */
  event: K;
  /** The function to run when the event is emitted */
  run: (client: Client<true>, ...args: ClientEvents[K]) => void;
}

export class ClientEventListener<
  K extends keyof ClientEvents = keyof ClientEvents,
> implements ClientEventListenerOptions<K>
{
  once: boolean;
  client?: Client<true>;
  event: K;

  static readonly default = {
    once: false,
  };

  constructor(options: ClientEventListenerOptions<K>, client?: Client<true>) {
    this.once = options.once ?? ClientEventListener.default.once;
    this.event = options.event;
    this.run = options.run;
    if (client) this.register(client);
  }
  run: (client: Client<true>, ...args: ClientEvents[K]) => void;

  register(client: Client<true>) {
    this.client = client;
    const listener = (this.once ? client.once : client.on).bind(client);
    listener(this.event, (...args) => this.run(client, ...args));
  }

  unregister() {
    if (!this.client) return;
    const listener = (
      this.once ? this.client.off : this.client.removeListener
    ).bind(this.client);
    listener(this.event, (...args) => this.run(this.client!, ...args));
  }

  toString() {
    return `${this.event}${this.once ? ' (once)' : ''}`;
  }

  toJSON() {
    return {
      event: this.event,
      once: this.once,
    };
  }

  valueOf() {
    return this.event;
  }

  [Symbol.toPrimitive]() {
    return this.event;
  }

  [Symbol.toStringTag]() {
    return this.event;
  }

  [Symbol.hasInstance](instance: unknown) {
    return instance instanceof ClientEventListener;
  }

  static isClientEventListener<K extends keyof ClientEvents>(
    instance: unknown,
  ): instance is ClientEventListener<K> {
    return instance instanceof ClientEventListener;
  }

  static isClientEventListenerArray<K extends keyof ClientEvents>(
    instance: unknown,
  ): instance is ClientEventListener<K>[] {
    return (
      Array.isArray(instance) &&
      instance.every((item) => ClientEventListener.isClientEventListener(item))
    );
  }
}
