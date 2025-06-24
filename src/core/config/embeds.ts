import { APIEmbed, EmbedBuilder, type EmbedData } from 'discord.js';
import { StringUtils, TimeUtils } from '../utils';
import { EmbedConstants } from '../constants';
import { appConfig } from './app';
import { SafeEmbedBuilder } from '@core/utils/embeds';
import { PopulatedEmbed } from '@core/database';

type EmbedType = keyof typeof appConfig.colors;

type EmbedTimestampStyle = 'short' | 'long';

type CreateEmbedData = string | Omit<EmbedData, 'color'> | APIEmbed;

type EmbedsOptions = {
  useSafeEmbeds?: boolean;
  useTimestamp?: boolean;
  timestampInline?: boolean;
  timestampStyle?: EmbedTimestampStyle;
  embedBase?: EmbedData;
};

class Embeds implements EmbedsOptions {
  public useTimestamp: boolean;
  public timestampInline: boolean;
  public timestampStyle: EmbedTimestampStyle;
  public embedBase: EmbedData;

  constructor(options: EmbedsOptions) {
    this.useTimestamp = options?.useTimestamp ?? true;
    this.timestampInline = options?.timestampInline ?? false;
    this.timestampStyle = options?.timestampStyle ?? 'short';
    this.embedBase = options?.embedBase ?? {};
  }
  useSafeEmbeds?: boolean | undefined;

  public readonly resolveEmbedColor = (color?: EmbedType): number => {
    if (!color) return appConfig.colors.primary;

    return appConfig.colors[color];
  };

  public readonly applyTimestamp = (embed: EmbedBuilder) =>
    this.timestampStyle
      ? embed.setTimestamp()
      : embed.addFields({
          name: 'Timestamp',
          value: TimeUtils.discordInfoTimestamp(),
          inline: this.timestampInline,
        });

  public readonly resolveData = (data: CreateEmbedData) =>
    typeof data === 'string' ? { description: data } : data;

  public readonly build = (data: CreateEmbedData) => {
    const resolvedData = this.resolveData(data);
    const embed = this.useSafeEmbeds
      ? new SafeEmbedBuilder(resolvedData)
      : new EmbedBuilder(resolvedData);
    if (this.useTimestamp) this.applyTimestamp(embed);
    return embed;
  };

  public readonly status = (status: EmbedType, data?: CreateEmbedData) => {
    const resolvedData =
      (typeof data === 'string' ? { description: data } : data) ?? {};
    const options = this.embedBase;
    delete options.author;
    const embed = this.build({
      ...this.embedBase,
      ...resolvedData,
      timestamp:
        typeof resolvedData.timestamp === 'number'
          ? new Date(resolvedData.timestamp).toISOString()
          : undefined,
      fields: [
        ...(this.embedBase.fields ?? []),
        ...(resolvedData.fields ?? []),
      ],
    });
    embed.setColor(appConfig.colors[status]);

    let statusText = `### ${appConfig.emojis[status]} `;

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

  public readonly primary = (data?: CreateEmbedData) =>
    this.status('primary', data);
  public readonly secondary = (data?: CreateEmbedData) =>
    this.status('secondary', data);
  public readonly success = (data?: CreateEmbedData) =>
    this.status('success', data);
  public readonly error = (data?: CreateEmbedData) =>
    this.status('error', data);
  public readonly warning = (data?: CreateEmbedData) =>
    this.status('warning', data);
  public readonly info = (data?: CreateEmbedData) => this.status('info', data);
  public readonly debug = (data?: CreateEmbedData) =>
    this.status('debug', data);
  public readonly waiting = (data?: CreateEmbedData) =>
    this.status('waiting', data);

  public readonly fromEmbedModel = (
    embed: PopulatedEmbed | null,
    baseEmbed = new EmbedBuilder(),
  ) => {
    const embedBuilder = baseEmbed.setColor(
      embed?.color ?? appConfig.colors.primary,
    );

    if (embed?.title) embedBuilder.setTitle(embed.title);
    if (embed?.description) embedBuilder.setDescription(embed.description);
    if (embed?.url) embedBuilder.setURL(embed.url);
    if (embed?.imageURL) embedBuilder.setImage(embed.imageURL);
    if (embed?.thumbnailURL) embedBuilder.setThumbnail(embed.thumbnailURL);

    if (embed?.authorName) {
      const author: {
        name: string;
        icon_url?: string;
        url?: string;
      } = { name: embed?.authorName };
      if (embed?.authorIconURL) author.icon_url = embed.authorIconURL;
      if (embed?.authorURL) author.url = embed.authorURL;
      embedBuilder.setAuthor(author);
    }

    if (embed?.footerText) {
      const footer: {
        text: string;
        icon_url?: string;
      } = { text: embed?.footerText };
      if (embed?.footerIconURL) footer.icon_url = embed.footerIconURL;
      embedBuilder.setFooter(footer);
    }

    if (embed?.fields)
      for (const field of embed.fields) {
        embedBuilder.addFields({
          name: field.name,
          value: field.value,
          inline: field.inline,
        });
      }

    return embedBuilder;
  };
}

const embeds = new Embeds({
  useSafeEmbeds: true,
  timestampInline: true,
  timestampStyle: 'short',
  useTimestamp: true,
  embedBase: {
    footer: {
      text: `${appConfig.pkg.name} v${appConfig.pkg.version}`,
    },
  },
});

export {
  Embeds as _Embeds,
  embeds as Embeds,
  type EmbedType,
  type EmbedTimestampStyle,
  type CreateEmbedData,
  type EmbedsOptions,
};
