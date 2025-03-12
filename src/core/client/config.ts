import { Colors, HexColorString, resolveColor } from 'discord.js';

export const resolveColorConfig = (
  hexColor: HexColorString | undefined,
  defaultInt: number,
): number => {
  if (!hexColor) return defaultInt;
  const resolvedColor = resolveColor(hexColor);
  if (resolvedColor === null) return defaultInt;
  return resolvedColor;
};

export interface IEmojis {
  success: string;
  error: string;
  info: string;
  warning: string;
  debug: string;
  waiting: string;
  separator: string;
}

export interface IColors {
  primary: HexColorString;
  secondary: HexColorString;
  success: HexColorString;
  error: HexColorString;
  info: HexColorString;
  warning: HexColorString;
  debug: HexColorString;
  waiting: HexColorString;
}

export const defaultEmojis = {
  success: '☑️',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
  debug: '🐛',
  waiting: '⏳',
  separator: '•',
};

export const defaultColors = {
  primary: Colors.Blurple,
  secondary: Colors.Greyple,
  success: Colors.Green,
  debug: resolveColor('#af86fc'),
  error: Colors.Red,
  warning: resolveColor('#ffc61b'),
  info: resolveColor('#77c8d5'),
  waiting: resolveColor('#f7b977'),
};

export type NumberColors<T> = {
  [K in keyof T]: number;
};

export type UserColors = NumberColors<IColors>;
