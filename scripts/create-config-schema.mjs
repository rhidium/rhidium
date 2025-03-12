import { writeFileSync } from 'fs';
import { createGenerator } from 'ts-json-schema-generator';

/**
 * @type {import('ts-json-schema-generator').Config}
 */
const generatorOptions = {
  path: './src/core/config/types.ts',
  tsconfig: './tsconfig.json',
  type: 'UserConfigOptions',
  skipTypeCheck: true,
  expose: 'export',
  topRef: true,
};

const schema = createGenerator(generatorOptions).createSchema(
  generatorOptions.type,
);
const schemaString = JSON.stringify(schema);

writeFileSync('./config/config.schema.json', schemaString);
