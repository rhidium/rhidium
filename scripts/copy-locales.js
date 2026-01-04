#!/usr/bin/env node

/**
 * Copy locales from rhidium to consumer project
 * Usage: pnpm run cp:locales <destination>
 * Example: pnpm run cp:locales ./locales
 */

import { cpSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Error: Destination directory is required');
  console.error('Usage: pnpm run cp:locales <destination>');
  console.error('Example: pnpm run cp:locales ./locales');
  process.exit(1);
}

const destination = resolve(process.cwd(), args[0]);
const source = resolve(__dirname, '../locales');

if (!existsSync(source)) {
  console.error(`Error: Source locales directory not found at ${source}`);
  process.exit(1);
}

try {
  // Create destination directory if it doesn't exist
  if (!existsSync(destination)) {
    mkdirSync(destination, { recursive: true });
  }

  if (destination === source) {
    console.error('Error: Destination directory cannot be the same as the source directory');
    process.exit(1);
  }

  // Copy locales recursively
  cpSync(source, destination, { recursive: true });
  
  console.log(`✅ Successfully copied locales from rhidium to ${destination}`);
  console.log('');
  console.log('You can now customize these locales for your project.');
  console.log('To use them, set the RHIDIUM_LOCALES_DIR environment variable:');
  console.log(`  export RHIDIUM_LOCALES_DIR=${destination}`);
  console.log('');
  console.log('Or call setLocalesDirectory() in your code:');
  console.log(`  setLocalesDirectory('${destination}');`);
} catch (error) {
  console.error('Error copying locales:', error.message);
  process.exit(1);
}
