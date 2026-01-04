import { defineConfig } from 'tsdown'

export default defineConfig((options) => {
  return {
    entry: [
      'src/index.ts',
      'src/main.ts',
      'src/core/**/*.ts',
      'src/modules/**/*.ts',
      '!src/core/index.namespace.ts',
    ],
    splitting: false, // Disable code splitting for simpler output
    sourcemap: true,
    unbundle: true, // Note: We want to preserve module boundaries
    format: ['cjs' as const, 'esm' as const],
    clean: true,
    treeshake: true,
    minify: !options.watch,
    exports: {
      enabled: true,
      packageJson: true,
      devExports: false,
      customExports(exports, context) {
        // Add `types` field to package.json export objects
        console.log('Adding types field to package.json exports for', exports)
        for (const exportKey in exports) {
          const exportEntry = exports[exportKey]
          if (typeof exportEntry === 'object' && !Array.isArray(exportEntry)) {
            if ('require' in exportEntry) {
              exportEntry.types = exportEntry.require
                .replace(/\.cjs$/, '.ts')
                .replace(/\/dist\//, '/src/')
            }
            else if ('import' in exportEntry) {
              exportEntry.types = exportEntry.import
                .replace(/\.mjs$/, '.ts')
                .replace(/\/dist\//, '/src/')
            }
          }
        }
        return exports;
      },
    },
    copy: [
      './config',
      './locales',
      './package.json',
    ],
    // Note: If you're getting errors when enabling dts, try the following command for debugging:
    // pnpm tsc --emitDeclarationOnly --declaration --declarationMap false
    // [DEV] Still failing: [plugin rolldown-plugin-dts:generate] RangeError: Maximum call stack size exceeded
    // Note: Needs serious debugging: https://github.com/microsoft/TypeScript/issues/40819#issuecomment-700379873
    dts: false,
    external: (id) => {
      if (id.endsWith('.json')) return true
      return void 0 // Otherwise void, as we are not sure if the dependency is external
    },
    inputOptions: {
      checks: {
        circularDependency: true,
        commonJsVariableInEsm: true,
        configurationFieldConflict: true,
        emptyImportMeta: true,
        eval: true,
        filenameConflict: true,
        importIsUndefined: true,
        missingGlobalName: true,
        missingNameOptionForIifeExport: true,
        preferBuiltinFeature: true,
        unresolvedEntry: true,
        unresolvedImport: true,
        cannotCallNamespace: true,
        couldNotCleanDirectory: true,
        mixedExports: true,
        pluginTimings: true,
      },
      onLog(level, log, defaultHandler) {
        if (level === 'warn') {
          if (log.code === 'CIRCULAR_DEPENDENCY' && /Circular dependency: \.\.\/\.\.\/node_modules/.test(log.message)) {
            console.log("Ignoring circular dependency warning from node_modules.");
            return;
          }
          throw new Error(`Build warning treated as error: ${log.message}`);
        } else {
          defaultHandler(level, log);
        }
      },
    },
  }
})
