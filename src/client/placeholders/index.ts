import { EmbedBuilder } from 'discord.js';

export * from './discord';

export type PlaceholderString<T extends string = string> = `{{${T}}}`;

export type Placeholders<
  S extends string = string,
  T extends PlaceholderString<S> = PlaceholderString<S>,
> = {
  [key in T]: string;
};

export const placeholderRegex = /(?<placeholder>{{\s*[a-zA-Z0-9@#]+\s*}})/g;

export const isPlaceholder = (str: string): boolean =>
  placeholderRegex.test(str);

export const replacePlaceholders = <P extends Placeholders>(
  str: string,
  placeholders: Required<P>,
): string => {
  const matches = str.matchAll(placeholderRegex);
  const replacedPlaceholders: string[] = [];
  let newStr: string = str;
  for (const match of matches) {
    const placeholder = match.groups?.placeholder;
    const cleanPlaceholder = placeholder?.replace(/{{\s*|\s*}}/g, '');
    if (!placeholder || !cleanPlaceholder) continue;
    if (
      !(cleanPlaceholder in placeholders) ||
      replacedPlaceholders.includes(placeholder)
    )
      continue;

    const value = placeholders[cleanPlaceholder as keyof typeof placeholders];
    newStr = newStr.replace(placeholder, `${value}`);
    replacedPlaceholders.push(placeholder);
  }

  return newStr;
};

export const replacePlaceholdersAcrossEmbed = <P extends Placeholders>(
  embed: EmbedBuilder,
  placeholders: P,
): EmbedBuilder => {
  const embedStr = replacePlaceholders(JSON.stringify(embed), placeholders);
  return EmbedBuilder.from(JSON.parse(embedStr));
};
