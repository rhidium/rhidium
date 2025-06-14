type StringifyArrayOptions<T> = {
  maxItems: number;
  maxItemLength?: number;
  maxTotalLength?: number;
  stringify: (item: T) => string;
  prefix?: string;
  suffix?: string;
  joinString?: string;
};

const truncate = (input: string, length: number, suffix = '...'): string =>
  input.length > length
    ? input.slice(0, length - suffix.length) + suffix
    : input;

const stringifyArray = <T>(
  arr: T[],
  options: StringifyArrayOptions<T>,
): {
  result: string;
  truncatedItems: number;
} => {
  const {
    prefix = '',
    suffix = '',
    maxItemLength,
    maxTotalLength,
    joinString = ', ',
    maxItems,
    stringify,
  } = options;
  const reservedLength = prefix.length + suffix.length;

  const withOptions = (_arr: string[]) =>
    prefix + _arr.join(joinString) + suffix;

  const processArray = (
    _arr: T[],
  ): {
    result: string[];
    truncatedItems: number;
  } => {
    const processItem = (item: T) => {
      const itemStr = stringify(item);

      if (
        typeof maxItemLength === 'undefined' ||
        itemStr.length <= maxItemLength
      ) {
        return itemStr;
      }

      return truncate(itemStr, maxItemLength);
    };

    if (typeof maxTotalLength === 'undefined')
      return {
        result: _arr.map(processItem),
        truncatedItems: 0,
      };

    let totalLength = 0;
    const result: string[] = [];

    for (const item of _arr) {
      const itemStr = processItem(item);

      totalLength += itemStr.length;

      if (totalLength > maxTotalLength - reservedLength) break;

      result.push(itemStr);
    }

    return {
      result,
      truncatedItems: _arr.length - result.length,
    };
  };

  const processed = processArray(arr.slice(0, maxItems));

  return {
    result: withOptions(processed.result),
    truncatedItems: processed.truncatedItems,
  };
};

const displayArray = <T>(
  arr: T[],
  options: StringifyArrayOptions<T> & {
    emptyOutput: string;
  },
): string => {
  if (arr.length === 0) return options.emptyOutput;

  const { result, truncatedItems } = stringifyArray(arr, options);

  return `${result}${
    truncatedItems > 0 ? `\n...and ${truncatedItems} more...` : ''
  }`;
};

const pluralize = (input: string, count: number): string =>
  count === 1 ? input : `${input}s`;

const snakeCase = (input: string): string =>
  input
    .replace(/\s+/g, '_')
    .replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
    .replace(/^_/, '')
    .toLowerCase();

const titleCase = (input: string): string =>
  input
    .toLowerCase()
    .split(' ')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

const kebabCase = (input: string): string =>
  input
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    ?.join('-')
    .toLowerCase() ?? input;

const camelCase = (input: string): string =>
  input
    .toLowerCase()
    .split(/\s+/)
    .reduce((s, c) => s + (c.charAt(0).toUpperCase() + c.slice(1)));

const pascalCase = (input: string): string =>
  input.replace(
    /(\w)(\w*)/g,
    (_g0, g1, g2) => `${g1.toUpperCase()}${g2.toLowerCase()}`,
  );

const splitOnUppercase = (input: string, splitChar = ' '): string =>
  input.split(/(?=[A-Z])/).join(splitChar);

const replaceTags = (
  input: string,
  placeholders: Record<string, string>,
): string =>
  Object.entries(placeholders).reduce(
    (str, [key, value]) => str.replace(new RegExp(`{${key}}`, 'g'), value),
    input,
  );

const isUrl = (input: string): boolean => {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
};

class StringUtils {
  /**
   * Truncate a string to a certain length
   * @param input The input string
   * @param length The maximum length
   * @param suffix The suffix to append if the string is truncated
   * @returns The truncated string
   */
  static readonly truncate = truncate;
  /**
   * Truncate an array of items into a string
   * @param arr The array to truncate
   * @param options The options to use
   * @returns The truncated string
   */
  static readonly stringifyArray = stringifyArray;
  /**
   * Utility wrapper for {@link stringifyArray} that handles empty arrays
   * and displaying the number of truncated items
   * @param arr The array to display
   * @param options The options to use
   * @returns The displayed string
   */
  static readonly displayArray = displayArray;
  /**
   * Pluralize a string based on a count
   * @param input The input string
   * @param count The count
   * @returns The pluralized string (e.g. 'apple' -> 'apples')
   */
  static readonly pluralize = pluralize;
  /**
   * Convert a string to snake_case
   * @param input The input string
   * @returns The snake_case string
   */
  static readonly snakeCase = snakeCase;
  /**
   * Converts a string to Title Case
   * @param input The input string
   * @returns The Title Case string
   */
  static readonly titleCase = titleCase;
  /**
   * Convert a string to kebab-case
   * @param input The input string
   * @returns The kebab-case string
   */
  static readonly kebabCase = kebabCase;
  /**
   * Convert a string to camelCase
   * @param input The input string
   * @returns The camelCase string
   */
  static readonly camelCase = camelCase;
  /**
   * Convert a string to PascalCase
   * @param input The input string
   * @returns The PascalCase string
   */
  static readonly pascalCase = pascalCase;
  /**
   * Split a string on uppercase chars and join them back together
   * @param input The input string
   * @param splitChar The character to split on
   * @returns The split string
   */
  static readonly splitOnUppercase = splitOnUppercase;
  /**
   * Replace all available tags/placeholders in a string
   * @param input The input string
   * @param placeholders A record of placeholders to replace, where the key is the placeholder and the value is the replacement
   * @returns A string that has had all placeholders replaced
   */
  static readonly replaceTags = replaceTags;
  /**
   * Check if a string is a valid URL
   * @param input The input string
   * @returns Whether the input is a valid URL
   */
  static readonly isUrl = isUrl;
}

export { StringUtils, type StringifyArrayOptions };
