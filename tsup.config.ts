import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: false,
  entry: ['src/client/index.ts'],
  format: ['cjs', 'esm'],
  minify: true,
  sourcemap: true,
  splitting: true,
  tsconfig: 'tsconfig.json',
});
