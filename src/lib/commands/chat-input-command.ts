import { ChatInputCommandInteraction } from 'discord.js';
import {
  APICommand,
  APICommandOptions,
  APISlashCommandData,
} from './api-command';

export interface ChatInputCommandOptions<
  I extends ChatInputCommandInteraction = ChatInputCommandInteraction,
> extends APICommandOptions<I> {
  /** Command data to send off to the Discord API, resolved by builder */
  data: APISlashCommandData;
}

/**
 * Represents a command with chat input, aka: a Slash command (/)
 */
export class ChatInputCommand<
    I extends ChatInputCommandInteraction = ChatInputCommandInteraction,
  >
  extends APICommand<I>
  implements ChatInputCommandOptions<I>
{
  override data: APISlashCommandData;

  constructor(options: ChatInputCommandOptions<I>) {
    super(options);
    this.data = options.data;
  }
}
