import { StringUtils } from './strings';

const chunk = <T>(arr: T[], size: number): T[][] => {
  const result = [];

  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, size + i));
  }

  return result;
};

const join = <T extends unknown[]>(
  arr: T,
  options: JoinOptions = {},
): string => {
  let output: string;
  const {
    maxItems = -1,
    maxLength = -1,
    emptyOutput = 'None',
    joinString = ', ',
  } = options;

  const withMaxLength = (str: string) => {
    if (maxLength === -1) return str;
    return str.length > maxLength ? StringUtils.truncate(str, maxLength) : str;
  };

  if (arr.length === 0) output = emptyOutput;
  else if (arr.length <= maxItems) {
    output = arr.join(joinString);
  } else {
    const includedItems = arr.slice(0, maxItems);
    const excludedItemsCount = arr.length - maxItems;
    const excludedItemsMessage = `and ${excludedItemsCount} more...`;

    output = includedItems.join(joinString) + ', ' + excludedItemsMessage;
  }

  return withMaxLength(output);
};

class ArrayUtils {
  /**
   * Split an array into smaller chunks
   * @param arr The array to split
   * @param size The size of each chunk
   * @returns An array of chunks
   */
  static readonly chunk = chunk;
  /**
   * Join an array of strings with a limit
   * @param arr The array of strings to join
   * @param options The options to use
   * @returns The joined string
   */
  static readonly join = join;

  static readonly isStringArray = (arr: unknown[]): arr is string[] =>
    arr.every((item) => typeof item === 'string');
  static readonly isNumberArray = (arr: unknown[]): arr is number[] =>
    arr.every((item) => typeof item === 'number');
  static readonly isBooleanArray = (arr: unknown[]): arr is boolean[] =>
    arr.every((item) => typeof item === 'boolean');
  static readonly isObjectArray = (
    arr: unknown[],
  ): arr is Record<string, unknown>[] =>
    arr.every((item) => typeof item === 'object');
}

type JoinOptions = {
  /**
   * The string to join the items with
   * @default ', '
   */
  joinString?: string;
  /**
   * The maximum number of (array) items to include
   * @default -1
   */
  maxItems?: number;
  /**
   * The maximum length of the joined/final string
   * @default -1
   */
  maxLength?: number;
  /**
   * The string that is returned if the input array is empty
   * @default 'None'
   */
  emptyOutput?: string;
};

export { ArrayUtils, type JoinOptions };
