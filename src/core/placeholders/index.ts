import {
  GuildChannel,
  Guild,
  GuildMember,
  User,
  ThreadChannel,
  EmbedBuilder,
  type PartialGuildMember,
} from 'discord.js';
import extractProperty from 'object-property-extractor';
import { placeholderKeys } from './keys';
import {
  type ContextPlaceholders,
  type DefaultIgnoreTypes,
  type ExtractKeys,
  type Placeholders,
} from './types';

class Placeholder {
  public static readonly placeholderKeys = placeholderKeys;

  public static readonly parse = <
    Obj extends object,
    Prefix extends string = '',
  >(
    obj: Obj,
    placeholderKeys: (keyof Placeholders<
      ExtractKeys<Obj, '', 3, DefaultIgnoreTypes, '', ''>
    >)[],
    prefix?: Prefix,
    depth = 3,
  ): Placeholders<ExtractKeys<Obj, Prefix>, string> => {
    if (depth <= 0) {
      return {};
    }

    const placeholders: Record<string, string> = {};

    for (let i = 0; i < placeholderKeys.length; i++) {
      const key = placeholderKeys[i] as string;
      const value = extractProperty(obj, key, null);
      const placeholderKey = `{${prefix}${key}}`;

      if (value === null || typeof value === 'undefined') {
        placeholders[placeholderKey] = 'n/a';
        continue;
      }

      placeholders[placeholderKey] = value.toString();
    }

    return placeholders;
  };

  public static parseContext = (options: {
    user: User;
    member: GuildMember | PartialGuildMember;
    guild: Guild;
    channel: GuildChannel | ThreadChannel | 'n/a';
  }): ContextPlaceholders => {
    const parseOptionalChannel = (
      channel: GuildChannel | ThreadChannel | 'n/a',
    ) => {
      return Placeholder.parse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        channel === 'n/a' ? ({} as any) : channel,
        Placeholder.placeholderKeys.channel,
        'channel.',
      );
    };

    return {
      ...Placeholder.parse(
        options.user,
        Placeholder.placeholderKeys.user,
        'user.',
      ),
      ...Placeholder.parse(
        options.member,
        Placeholder.placeholderKeys.member,
        'member.',
      ),
      ...Placeholder.parse(
        options.guild,
        Placeholder.placeholderKeys.guild,
        'guild.',
      ),
      ...parseOptionalChannel(options.channel),
    };
  };

  public static apply = (
    str: string,
    placeholders: ContextPlaceholders | [string, string][],
  ): string => {
    const matches = Array.isArray(placeholders)
      ? placeholders
      : Placeholder.match(str, placeholders);
    if (matches.length === 0) {
      return str;
    }

    for (const [placeholderKey, placeholderValue] of matches) {
      str = str.replace(placeholderKey, placeholderValue);
    }

    return str;
  };

  public static match = (
    str: string,
    placeholders: ContextPlaceholders,
  ): [string, string][] => {
    const regex = /{([\w.]+)}/g;
    let match: RegExpExecArray | null;
    const matches: [string, string][] = [];

    while ((match = regex.exec(str)) !== null) {
      const placeholderKey = `{${match[1]}}`;
      const placeholderValue =
        placeholders[placeholderKey as keyof ContextPlaceholders];

      if (typeof placeholderValue === 'string') {
        matches.push([placeholderKey, placeholderValue]);
      }
    }

    return matches;
  };

  public static applyToEmbed = (
    embed: EmbedBuilder,
    placeholders: ContextPlaceholders | [string, string][],
  ): EmbedBuilder => {
    const str = JSON.stringify(embed.data);
    const matches = Array.isArray(placeholders)
      ? placeholders
      : Placeholder.match(str, placeholders);

    if (matches.length === 0) {
      return EmbedBuilder.from(embed);
    }

    return EmbedBuilder.from(JSON.parse(this.apply(str, matches)));
  };
}

export { Placeholder };
