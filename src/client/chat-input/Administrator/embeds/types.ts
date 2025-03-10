import { GuildWithEmbeds } from '@/database';
import { Prisma } from '@prisma/client';
import { ChatInputCommandInteraction } from 'discord.js';
import { GuildCommandController } from '@rhidium/core';

/**
 * Nothing is required in this data structure, all fields are optional
 * and will be set to null if not provided - when constructing an embed
 * from this data, make sure either title or description has a default
 */
export type ConfigureEmbedData = {
  title: string | null | undefined;
  color: string | null | undefined;
  authorName: string | null | undefined;
  authorIconUrl: string | null | undefined;
  authorUrl: string | null | undefined;
  description: string | null | undefined;
  url: string | null | undefined;
  imageUrl: string | null | undefined;
  thumbnailUrl: string | null | undefined;
  footerText: string | null | undefined;
  footerIconUrl: string | null | undefined;
  fields: string[];
};

export type EmbedWithFields = Prisma.EmbedGetPayload<{
  include: { fields: true };
}>;

export type EmbedController = GuildCommandController<
  ChatInputCommandInteraction,
  [GuildWithEmbeds]
>;

export type EmbedFieldController = GuildCommandController<
  ChatInputCommandInteraction,
  [GuildWithEmbeds, EmbedWithFields | null]
>;
