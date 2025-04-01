/**
 * @link https://discord.com/developers/docs/resources/message#embed-object-embed-limits
 */
export class EmbedConstants {
  /**
   * The combined sum of characters in all `title`, `description`, `field.name`,
   * `field.value`, `footer.text`, and `author.name` fields across all embeds
   * attached to a message must not exceed `6000` characters.
   */
  static readonly MAX_CHARACTERS_ACROSS_EMBEDS_PER_MESSAGE = 6000;
  static readonly MAX_FIELDS_PER_EMBED = 25;
  static readonly TITLE_MAX_LENGTH = 256;
  static readonly DESCRIPTION_MAX_LENGTH = 4096;
  static readonly FIELD_NAME_MAX_LENGTH = 256;
  static readonly FIELD_VALUE_MAX_LENGTH = 1024;
  static readonly FOOTER_TEXT_MAX_LENGTH = 2048;
  static readonly AUTHOR_NAME_MAX_LENGTH = 256;
}
