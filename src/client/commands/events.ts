import Client from '@client/client';
import debug, { type Debugger } from '@client/debug';
import { ClientEvents, Events } from 'discord.js';

export interface ClientEventListenerOptions<K extends keyof ClientEvents> {
  /** Should we only listen for this event once? */
  once?: boolean;
  /** The event to listen for */
  event: K;
  /** The function to run when the event is emitted */
  run: K extends Events.ClientReady // Omit args for "ClientReady"
    ? (client: Client<true>) => void
    : ClientEvents[K] extends [] // Omit args if ClientEvents has no args
      ? (client: Client<true>) => void
      : (client: Client<true>, ...args: ClientEvents[K]) => void;
}

export class ClientEventListener<
  K extends keyof ClientEvents = keyof ClientEvents,
> {
  private readonly once: boolean;
  public readonly event: K;
  private readonly run: ClientEventListenerOptions<K>['run'];
  private readonly debug: Debugger;
  private static readonly defaults = {
    once: false,
  };

  public constructor(options: ClientEventListenerOptions<K>) {
    this.once = options.once ?? ClientEventListener.defaults.once;
    this.event = options.event;
    this.run = options.run;
    this.debug = debug.commands.listeners.extend(
      `${this.once ? 'once' : 'on'}-${this.event}`,
    );
  }

  public readonly register = (client: Client<true>) => {
    (this.once ? client.once : client.on).bind(client)(
      this.event,
      (...args) => {
        const run = this.run as ClientEventListenerOptions<K>['run'];
        if (this.event === Events.ClientReady) {
          // @ts-expect-error - Expression too complex
          run(client);
        } else {
          run(client, ...args);
        }
        this.debug(
          `Event ${this.event} fired with args: ${JSON.stringify(args)}`,
        );
      },
    );
  };
}
