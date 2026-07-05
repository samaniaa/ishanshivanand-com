import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import htmlPartials from './plugins/html-partials.js'

const pages = [
  'index',
  'research',
  'philanthropy',
  'work-with-ishan',
  'practice-of-immortality',
  'tradition',
  'media',
  'about',
  'connect',
]

export default defineConfig({
  appType: 'mpa',
  plugins: [htmlPartials({ dir: 'partials' })],
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((p) => [
          p,
          resolve(
            import.meta.dirname,
            p === 'index' ? 'index.html' : `${p}/index.html`
          ),
        ])
      ),
      output: {
        manualChunks: { gsap: ['gsap'] },
      },
    },
  },
})
