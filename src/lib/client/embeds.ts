import { EmbedBuilder, type EmbedData } from 'discord.js';
import { IEmojis, UserColors } from './config';
import { StringUtils, TimeUtils } from 'lib/utils';
import { EmbedConstants } from 'lib/constants';

export type EmbedStatus =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'debug'
  | 'waiting';

export interface EmbedsOptions {
  includeTimestamp?: boolean;
  timestampInline?: boolean;
  timestampSmall?: boolean;
  colors: UserColors;
  emojis: IEmojis;
  brandingOptions?: EmbedData;
}

export interface CreateEmbedOptions {
  description?: string;
  colorKey?: keyof UserColors;
}

export type CreateEmbedData = CreateEmbedOptions & EmbedData;

export type CreateStatusEmbedData =
  | string
  | Omit<CreateEmbedData, 'colorKey' | 'color'>;
export class Embeds implements EmbedsOptions {
  includeTimestamp: boolean;
  timestampInline: boolean;
  timestampSmall: boolean;
  colors: UserColors;
  emojis: IEmojis;
  brandingOptions: EmbedData;
  constructor(options: EmbedsOptions) {
    this.colors = {
      primary: options.colors.primary,
      secondary: options.colors.secondary,
      success: options.colors.success,
      error: options.colors.error,
      info: options.colors.info,
      warning: options.colors.warning,
      debug: options.colors.debug,
      waiting: options.colors.waiting,
    };

    this.emojis = {
      success: options.emojis.success,
      error: options.emojis.error,
      info: options.emojis.info,
      warning: options.emojis.warning,
      debug: options.emojis.debug,
      waiting: options.emojis.waiting,
      separator: options.emojis.separator,
    };

    this.includeTimestamp = options?.includeTimestamp ?? true;
    this.timestampInline = options?.timestampInline ?? false;
    this.timestampSmall = options?.timestampSmall ?? true;

    this.brandingOptions = {
      color: this.colors.primary,
      ...options?.brandingOptions,
    };
  }

  resolveEmbedColor = (color?: keyof UserColors | number) => {
    if (typeof color === 'number') return color;
    return color ? this.colors[color] : this.colors.primary;
  };

  applyTimestamp = (embed: EmbedBuilder) =>
    this.timestampSmall
      ? embed.setTimestamp()
      : embed.addFields({
          name: 'Timestamp',
          value: TimeUtils.discordInfoTimestamp(),
          inline: this.timestampInline,
        });

  build = (data: CreateEmbedData) => {
    const embed = new EmbedBuilder(data);
    embed.setColor(this.resolveEmbedColor(data.colorKey ?? embed.data.color));
    if (this.includeTimestamp) this.applyTimestamp(embed);
    return embed;
  };

  branding = (data: CreateEmbedData) => {
    const options = { ...this.brandingOptions, ...data };
    const embed = this.build(options);
    return embed;
  };

  status = (status: EmbedStatus, data: CreateStatusEmbedData) => {
    const resolvedData =
      typeof data === 'string' ? { description: data } : data;
    const options = this.brandingOptions;
    delete options.author;
    const embed = this.build({ ...this.brandingOptions, ...resolvedData });
    embed.setColor(this.colors[status]);

    let statusText = `### ${this.emojis[status]} `;
    if (embed.data.title) {
      statusText += embed.data.title;
      embed.setTitle(null);
    } else statusText += StringUtils.titleCase(status);

    if (embed.data.description) {
      statusText += '\n';
      statusText += `${embed.data.description.slice(
        0,
        EmbedConstants.DESCRIPTION_MAX_LENGTH - statusText.length,
      )}`;
    }

    embed.setDescription(statusText);
    return embed;
  };

  success = (data: CreateStatusEmbedData) => this.status('success', data);
  error = (data: CreateStatusEmbedData) => this.status('error', data);
  warning = (data: CreateStatusEmbedData) => this.status('warning', data);
  info = (data: CreateStatusEmbedData) => this.status('info', data);
  debug = (data: CreateStatusEmbedData) => this.status('debug', data);
  waiting = (data: CreateStatusEmbedData) => this.status('waiting', data);

  /**
   * Extracts the description from an embed, removing the custom header
   * these embeds have in the description.
   */
  static readonly extractDescription = (embed: EmbedBuilder) => {
    if (!embed.data.description) return undefined;
    const [, ...description] = embed.data.description.split('\n');
    return description.join('\n');
  };

  /**
   * Extracts the description from an embed, removing the custom header
   * these embeds have in the description, and the codeblock.
   *
   * The following structure is expected (all in description field):
   * - title
   * - (codeblock start) ```
   * - ...description
   * - (codeblock end) ```
   */
  static readonly extractCodeblockDescription = (embed: EmbedBuilder) => {
    if (!embed.data.description) return undefined;
    const [
      ,
      ,
      // Title
      // Codeblock start,
      ...description
    ] = embed.data.description.split('\n');
    description.pop(); // Codeblock end
    return description.join('\n');
  };
}
