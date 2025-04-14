import {
  APIEmbed,
  APIEmbedField,
  EmbedAuthorOptions,
  EmbedBuilder,
  EmbedData,
  EmbedFooterOptions,
  RestOrArray,
} from 'discord.js';
import { StringUtils } from './common';
import { EmbedConstants } from '@core/constants';

class SafeEmbedBuilder extends EmbedBuilder {
  constructor(data?: EmbedData | APIEmbed) {
    super(data);
    return this;
  }

  private readonly withMaxLength = (builder: SafeEmbedBuilder): this => {
    const length = builder.length;

    if (length > EmbedConstants.MAX_CHARACTERS_ACROSS_EMBEDS_PER_MESSAGE) {
      const excess =
        length - EmbedConstants.MAX_CHARACTERS_ACROSS_EMBEDS_PER_MESSAGE;
      const titleLen = builder.data.title?.length ?? 0;
      const descriptionLen = builder.data.description?.length ?? 0;
      const footerLen = builder.data.footer?.text?.length ?? 0;
      const authorLen = builder.data.author?.name?.length ?? 0;
      const fieldsLen =
        builder.data.fields?.reduce(
          (acc, field) => acc + (field.name.length + field.value.length),
          0,
        ) ?? 0;

      const longestLen = Math.max(
        titleLen,
        descriptionLen,
        footerLen,
        authorLen,
        fieldsLen,
      );

      if (longestLen === titleLen && builder.data.title) {
        builder.data.title = StringUtils.truncate(
          builder.data.title,
          EmbedConstants.TITLE_MAX_LENGTH - excess,
        );
      } else if (longestLen === descriptionLen && builder.data.description) {
        builder.data.description = StringUtils.truncate(
          builder.data.description,
          EmbedConstants.DESCRIPTION_MAX_LENGTH - excess,
        );
      } else if (longestLen === footerLen && builder.data.footer?.text) {
        builder.data.footer.text = StringUtils.truncate(
          builder.data.footer.text,
          EmbedConstants.FOOTER_TEXT_MAX_LENGTH - excess,
        );
      } else if (longestLen === authorLen && builder.data.author?.name) {
        builder.data.author.name = StringUtils.truncate(
          builder.data.author.name,
          EmbedConstants.AUTHOR_NAME_MAX_LENGTH - excess,
        );
      } else if (longestLen === fieldsLen && builder.data.fields?.length) {
        // Recursively remove fields until the length is within limits
        builder.data.fields = builder.data.fields.slice(0, -1);
        return this.withMaxLength(builder);
      }
    }

    return this;
  };

  override setTitle(title: string | null): this {
    if (!title) return super.setTitle(title);

    return this.withMaxLength(
      super.setTitle(
        StringUtils.truncate(title, EmbedConstants.TITLE_MAX_LENGTH),
      ),
    );
  }

  override setDescription(description: string | null): this {
    if (!description) return super.setDescription(description);

    return this.withMaxLength(
      super.setDescription(
        StringUtils.truncate(
          description,
          EmbedConstants.DESCRIPTION_MAX_LENGTH,
        ),
      ),
    );
  }

  override setAuthor(options: EmbedAuthorOptions | null): this {
    if (!options) return super.setAuthor(options);

    const { name, url, iconURL } = options;

    return this.withMaxLength(
      super.setAuthor({
        name: StringUtils.truncate(name, EmbedConstants.AUTHOR_NAME_MAX_LENGTH),
        url,
        iconURL,
      }),
    );
  }

  override setFooter(options: EmbedFooterOptions | null): this {
    if (!options) return super.setFooter(options);

    const { text, iconURL } = options;

    return this.withMaxLength(
      super.setFooter({
        text: StringUtils.truncate(text, EmbedConstants.FOOTER_TEXT_MAX_LENGTH),
        iconURL,
      }),
    );
  }

  override spliceFields(
    index: number,
    deleteCount: number,
    ...fields: APIEmbedField[]
  ): this {
    if (fields.length > EmbedConstants.MAX_FIELDS_PER_EMBED) {
      fields = fields.slice(0, EmbedConstants.MAX_FIELDS_PER_EMBED);
    }

    return this.withMaxLength(
      super.spliceFields(
        index,
        deleteCount,
        ...fields.map((field) => ({
          ...field,
          name: StringUtils.truncate(
            field.name,
            EmbedConstants.FIELD_NAME_MAX_LENGTH,
          ),
          value: StringUtils.truncate(
            field.value,
            EmbedConstants.FIELD_VALUE_MAX_LENGTH,
          ),
        })),
      ),
    );
  }

  override addFields(
    ...fields:
      | RestOrArray<APIEmbedField>
      | [APIEmbedField[] | readonly APIEmbedField[]]
  ): this {
    return this.setFields([...(this.data.fields ?? []), ...fields].flat());
  }

  override setFields(
    ...fields:
      | RestOrArray<APIEmbedField>
      | [APIEmbedField[] | readonly APIEmbedField[]]
  ): this {
    return this.spliceFields(
      0,
      this.data.fields?.length ?? 0,
      ...fields.flat(),
    );
  }
}

export { SafeEmbedBuilder };
