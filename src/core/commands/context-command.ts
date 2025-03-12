import {
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
} from 'discord.js';
import { APICommand, APICommandOptions } from './api-command';

export interface ContextMenuCommandOptions<
  I extends
    UserContextMenuCommandInteraction = UserContextMenuCommandInteraction,
> extends APICommandOptions<I> {
  /** Command data to send off to the Discord API, resolved by builder */
  data?: ContextMenuCommandBuilder;
}

/** Represents a user context-command, right-click user > Apps */
export class UserContextCommand<
    I extends
      UserContextMenuCommandInteraction = UserContextMenuCommandInteraction,
  >
  extends APICommand<I>
  implements ContextMenuCommandOptions<I>
{
  override data: ContextMenuCommandBuilder;
  constructor(options: ContextMenuCommandOptions<I>) {
    super(options);
    this.data = options.data ?? new ContextMenuCommandBuilder();
    this.data.setType(2);
  }
}

export interface MessageContextCommandOptions<
  I extends
    MessageContextMenuCommandInteraction = MessageContextMenuCommandInteraction,
> extends APICommandOptions<I> {
  /** Command data to send off to the Discord API, resolved by builder */
  data?: ContextMenuCommandBuilder;
}

/** Represents a message context-command, right-click message > Apps */
export class MessageContextCommand<
    I extends
      MessageContextMenuCommandInteraction = MessageContextMenuCommandInteraction,
  >
  extends APICommand<I>
  implements MessageContextCommandOptions<I>
{
  override data: ContextMenuCommandBuilder;
  constructor(options: MessageContextCommandOptions<I>) {
    super(options);
    this.data = options.data ?? new ContextMenuCommandBuilder();
    this.data.setType(3);
  }
}
