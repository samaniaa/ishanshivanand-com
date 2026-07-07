import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import htmlPartials from '../plugins/html-partials.js'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * Single-page build for the shareable portable HTML: only the book page,
 * with all JS + CSS inlined into one document (viteSingleFile). Public
 * assets (images/videos/fonts, referenced by absolute /assets/ URLs) stay
 * external here and are folded in afterwards by tools/build-book-portable.mjs.
 */
const root = resolve(import.meta.dirname, '..')

export default defineConfig({
  root,
  plugins: [htmlPartials({ dir: 'partials' }), viteSingleFile()],
  build: {
    outDir: 'dist-portable',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, 'practice-of-immortality/index.html'),
    },
  },
})
