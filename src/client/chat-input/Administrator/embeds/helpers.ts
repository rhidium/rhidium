import { ConfigureEmbedData, EmbedWithFields } from './types';
import { EmbedBuilder } from 'discord.js';
import { AvailableEmbedConfiguration } from './enums';
import { EmbedConstants, StringUtils } from '@lib';
import { appConfig } from '@client/config';

export const fieldIdentificationLength = 6;
export const maxFieldNameLength =
  EmbedConstants.FIELD_NAME_MAX_LENGTH - fieldIdentificationLength;

export const settingsKeyFromEmbedOption = (
  embedOption: AvailableEmbedConfiguration,
) =>
  embedOption === AvailableEmbedConfiguration.MEMBER_JOIN
    ? 'memberJoinEmbed'
    : 'memberLeaveEmbed';

export const configureEmbedInputToEmbedData = (options: {
  [k: string]: string | undefined | null;
}): {
  embed: ConfigureEmbedData;
  message: string | null;
} => {
  const embedData: ConfigureEmbedData = {
    title: options['title'],
    color: options['color'],
    authorName: options['author-name'],
    authorIconUrl: options['author-icon-url'],
    authorUrl: options['author-url'],
    description: options['description'],
    url: options['url'],
    imageUrl: options['image-url'],
    thumbnailUrl: options['thumbnail-url'],
    footerText: options['footer-text'],
    footerIconUrl: options['footer-icon-url'],
    fields: [],
  };

  for (let i = 1; i <= EmbedConstants.MAX_FIELDS_LENGTH; i++) {
    const field = options[`field-${i}`];
    if (!field) continue;
    embedData.fields.push(field);
  }

  return {
    embed: embedData,
    message: options['message'] ?? null,
  };
};

export const embedDataUrlProperties: (keyof ConfigureEmbedData)[] = [
  'url',
  'imageUrl',
  'thumbnailUrl',
  'authorIconUrl',
  'footerIconUrl',
];

export const filterInvalidUrls = (data: ConfigureEmbedData) => {
  const resolvedData = { ...data };
  for (const property of embedDataUrlProperties) {
    const url = resolvedData[property];
    if (!url || typeof url !== 'string') continue;
    const isURL = StringUtils.isUrl(url);
    if (!isURL) delete resolvedData[property];
  }
  return resolvedData;
};

/**
 * Constructs an EmbedBuilder from the given ConfigureEmbedData,
 * and validates and filters out invalid properties, like color and urls
 */
export const resolveConfigureEmbedData = (
  data: ConfigureEmbedData,
  initialEmbed = new EmbedBuilder(),
): EmbedBuilder => {
  const embed = initialEmbed;
  const resolvedData = filterInvalidUrls(data);

  if (resolvedData.color)
    embed.setColor(
      resolvedData.color ? parseInt(resolvedData.color, 16) : null,
    );
  if (resolvedData.title || resolvedData.title === null)
    embed.setTitle(resolvedData.title);
  if (resolvedData.description || resolvedData.description === null)
    embed.setDescription(resolvedData.description);
  if (resolvedData.url || resolvedData.url === null)
    embed.setURL(resolvedData.url);
  if (resolvedData.imageUrl || resolvedData.imageUrl === null)
    embed.setImage(resolvedData.imageUrl);
  if (resolvedData.thumbnailUrl || resolvedData.thumbnailUrl === null)
    embed.setThumbnail(resolvedData.thumbnailUrl);

  if (resolvedData.authorName === null) embed.setAuthor(null);
  else if (resolvedData.authorName) {
    const author: {
      name: string;
      iconURL?: string;
      url?: string;
    } = { name: resolvedData.authorName };
    if (resolvedData.authorIconUrl) author.iconURL = resolvedData.authorIconUrl;
    if (resolvedData.authorUrl) author.url = resolvedData.authorUrl;
    embed.setAuthor(author);
  }

  if (resolvedData.footerText === null) embed.setFooter(null);
  else if (resolvedData.footerText) {
    const footer: {
      text: string;
      iconURL?: string;
    } = { text: resolvedData.footerText };
    if (resolvedData.footerIconUrl) footer.iconURL = resolvedData.footerIconUrl;
    embed.setFooter(footer);
  }

  for (const field of resolvedData.fields) {
    const [name, value, inline] = field.split(';');
    if (!name || !value) continue;
    embed.addFields({
      name,
      value,
      inline: inline === 'true',
    });
  }

  return embed;
};

export const embedFromEmbedModel = (
  embed: EmbedWithFields | null,
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
