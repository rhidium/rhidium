import { Colors } from 'discord.js';

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number) =>
  Math.random() * (max - min) + min;

const randomItem = <T>(items: T[]) =>
  items[Math.floor(Math.random() * items.length)];

const randomKey = <T>(items: Record<string, T> | T[]) =>
  randomItem(Object.keys(items));

const randomValue = <T>(items: Record<string, T> | T[]) =>
  randomItem(Array.isArray(items) ? items : Object.values(items));

const randomBoolean = () => Math.random() < 0.5;

const randomColor = (): [
  keyof typeof Colors,
  (typeof Colors)[keyof typeof Colors],
] => {
  const colorKey = randomKey(Colors) as keyof typeof Colors;

  return [colorKey, Colors[colorKey]];
};

const randomString = (
  length: number,
  characters?: string | RandomStringOptions,
) => {
  const resolveCharactersFromOptions = (options: RandomStringOptions) => {
    return [
      options.useUppercase ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '',
      options.useLowercase ? 'abcdefghijklmnopqrstuvwxyz' : '',
      options.useNumeric ? '0123456789' : '',
    ].join('');
  };

  const resolvedCharacters =
    typeof characters === 'string'
      ? characters
      : resolveCharactersFromOptions(characters ?? {});

  return Array.from({ length })
    .map(() =>
      resolvedCharacters.charAt(randomInt(0, resolvedCharacters.length - 1)),
    )
    .join('');
};

/**
 * A utility wrapper for "random" functions.
 *
 * Please note: These functions are not cryptographically secure,
 * and are considered "pseudo-random".
 */
class RandomUtils {
  /**
   * Returns a random integer between the min and max values
   * @param min The minimum value
   * @param max The maximum value
   * @returns A random integer
   */
  static readonly int = randomInt;
  /**
   * Returns a random float between the min and max values
   * @param min The minimum value
   * @param max The maximum value
   * @returns A random float
   */
  static readonly float = randomFloat;
  /**
   * Picks a random item from an array
   * @param items The array of items
   * @returns A random item
   */
  static readonly item = randomItem;
  /**
   * Picks a random key from an object/array
   * @param items The object to pick a key from
   * @returns A random key from the input object
   */
  static readonly key = randomKey;
  /**
   * Picks a random value from an object/array
   * @param items The object to pick a value from
   * @returns A random value from the input object
   */
  static readonly value = randomValue;
  /**
   * Returns a random boolean value
   * @returns A random boolean
   */
  static readonly boolean = randomBoolean;
  /**
   * Returns a random (discord.js) color as a key-value pair
   * @returns A random color
   */
  static readonly color = randomColor;
  /**
   * Returns a random string
   * @param length The length of the string
   * @param characters The characters to use in the string
   * @returns A random string
   */
  static readonly string = randomString;
}

type RandomStringOptions = {
  useNumeric?: boolean;
  useLowercase?: boolean;
  useUppercase?: boolean;
};

export { RandomUtils, type RandomStringOptions };
