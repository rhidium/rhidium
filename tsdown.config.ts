import { defineConfig } from 'tsdown'

export default defineConfig((options) => {
  return {
    entry: ['src/index.ts'],
    splitting: false, // Disable code splitting for simpler output
    sourcemap: true,
    unbundle: true, // Note: We want to preserve module boundaries
    format: ['cjs', 'esm'] as const,
    clean: true,
    treeshake: true,
    minify: !options.watch,
    copy: [
      './config',
      './locales',
      './package.json',
    ],
    dts: true,
    external: (id) => {
      if (id.endsWith('.json')) return true
    },
    // [DEV] RangeError: Maximum call stack size exceeded
    // async onSuccess() {
    //   const { execSync } = await import('node:child_process')
    //   console.log('Generating TypeScript declaration maps...')
    //   execSync('tsc --emitDeclarationOnly --declaration')
    //   console.log('Declaration maps generated successfully.')
    // },
  }
})
