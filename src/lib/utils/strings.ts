/** Convert a string to snake_case */
const snakeCase = (input: string): string =>
  input
    .replace(/\s+/g, '_')
    .replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
    .replace(/^_/, '')
    .toLowerCase();

/** Converts a string to Title Case */
const titleCase = (input: string): string =>
  input
    .toLowerCase()
    .split(' ')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

/** Convert a string to kebab-case */
const kebabCase = (input: string): string =>
  input
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    ?.join('-')
    .toLowerCase() ?? input;

/** Convert a string to camelCase */
const camelCase = (input: string): string =>
  input
    .toLowerCase()
    .split(/\s+/)
    .reduce((s, c) => s + (c.charAt(0).toUpperCase() + c.slice(1)));

/** Convert a string to PascalCase */
const pascalCase = (input: string): string =>
  input.replace(
    /(\w)(\w*)/g,
    (_g0, g1, g2) => `${g1.toUpperCase()}${g2.toLowerCase()}`,
  );

/** Split a string on uppercase chars and join them back together */
const splitOnUppercase = (input: string, splitChar = ' '): string =>
  input.split(/(?=[A-Z])/).join(splitChar);

/** Replace all available tags/placeholders  */
const replaceStringPlaceholders = (
  input: string,
  tags: Record<string, string>,
): string =>
  Object.entries(tags).reduce(
    (str, [key, value]) => str.replace(new RegExp(`{${key}}`, 'g'), value),
    input,
  );

const upperSnakeCaseToTitleCase = (input: string): string =>
  input
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const isUrl = (input: string): boolean => {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
};

const randomString = (length: number) => {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++)
    result += characters.charAt(Math.floor(Math.random() * charactersLength));

  return result;
};

export class StringUtils {
  static readonly snakeCase = snakeCase;
  static readonly titleCase = titleCase;
  static readonly kebabCase = kebabCase;
  static readonly camelCase = camelCase;
  static readonly pascalCase = pascalCase;
  static readonly splitOnUppercase = splitOnUppercase;
  static readonly replaceStringPlaceholders = replaceStringPlaceholders;
  static readonly upperSnakeCaseToTitleCase = upperSnakeCaseToTitleCase;
  static readonly isUrl = isUrl;
  static readonly randomString = randomString;
}
