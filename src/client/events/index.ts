import type Client from '@client/client';
import type { ClientEvents } from 'discord.js';

interface EventListenerOptions<K extends keyof ClientEvents> {
  once?: boolean;
  event: K;
  run: (client: Client<true>, ...args: ClientEvents[K]) => void;
}

class EventListener<K extends keyof ClientEvents = keyof ClientEvents>
  implements EventListenerOptions<K>
{
  public readonly once: boolean;
  public readonly event: K;
  public readonly run: (client: Client<true>, ...args: ClientEvents[K]) => void;

  static readonly defaults = {
    once: false,
  };

  constructor(options: EventListenerOptions<K>) {
    this.once = options.once ?? EventListener.defaults.once;
    this.event = options.event;
    this.run = options.run;
  }

  public readonly register = (client: Client<true>) => {
    (this.once ? client.once : client.on)
      .bind(client)
      .call(client, this.event, this.run);
  };
}

export { EventListener, type EventListenerOptions };
