import { Severity } from '@prisma/client';
import { randomBytes } from 'crypto';

export const generateKey = (
  size = 32,
  format: BufferEncoding | undefined = 'base64',
): string => {
  return randomBytes(size).toString(format);
};

export const severityEntries = Object.entries(Severity);
export const severityValues = severityEntries.map(([, value]) => value);
export const severityChoices = severityEntries.map(([key, value]) => ({
  name: key,
  value,
}));
