import { randomBytes } from 'crypto';

export const generateKey = (
  size = 32,
  format: BufferEncoding | undefined = 'base64',
): string => {
  return randomBytes(size).toString(format);
};
