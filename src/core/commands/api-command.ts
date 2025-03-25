import {
  RepliableInteraction,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { BaseCommand, BaseCommandOptions } from './base-command';

export type APISlashCommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
  | Omit<
      SlashCommandBuilder,
      | 'addBooleanOption'
      | 'addUserOption'
      | 'addChannelOption'
      | 'addRoleOption'
      | 'addAttachmentOption'
      | 'addMentionableOption'
      | 'addStringOption'
      | 'addIntegerOption'
      | 'addNumberOption'
    >;

export type APICommandData = APISlashCommandData | ContextMenuCommandBuilder;

export interface APICommandOptions<
  I extends RepliableInteraction = RepliableInteraction,
> extends BaseCommandOptions<I> {
  /**
   * Indicates if this command is available globally. If
   * NODE_ENV is `production` it will default to `true`. If NODE_ENV
   * is anything else, it will default to `false`.
   */
  global?: boolean;
}

/**
 * Represents a Discord API Command, chat-input commands, user- and message-context commands, etc.
 */
export class APICommand<I extends RepliableInteraction = RepliableInteraction>
  extends BaseCommand<I>
  implements APICommandOptions<I>
{
  global: boolean;
  constructor(options: APICommandOptions<I>) {
    super(options);
    this.global = options.global ?? process.env.NODE_ENV === 'production';
  }
}
