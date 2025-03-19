import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  dts: true,
  sourcemap: true,
  splitting: false,
  esbuildOptions(options) {
    options.outExtension = { '.js': '.js' } // important for Deno compatibility
  },
})
