import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Build-time HTML includes.
 *
 * Usage in any page:
 *   <!-- @include header.html {"active":"about","theme":"dawn"} -->
 *
 * Inside a partial, {{key}} is replaced from the JSON passed at the
 * include site. Unresolved {{key}} placeholders are removed. Partials
 * may include other partials (depth-capped).
 */
const INCLUDE_RE = /<!--\s*@include\s+([\w./-]+)(?:\s+(\{[\s\S]*?\}))?\s*-->/g
const MAX_DEPTH = 3

export default function htmlPartials({ dir = 'partials' } = {}) {
  let root = process.cwd()

  function render(html, vars, depth) {
    if (depth > MAX_DEPTH) return html
    const withIncludes = html.replace(INCLUDE_RE, (_, file, json) => {
      const partialPath = resolve(root, dir, file)
      let content = readFileSync(partialPath, 'utf-8')
      const localVars = { ...vars, ...(json ? JSON.parse(json) : {}) }
      return render(content, localVars, depth + 1)
    })
    return withIncludes.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      key in vars ? vars[key] : ''
    )
  }

  return {
    name: 'html-partials',
    configResolved(config) {
      root = config.root
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return render(html, {}, 0)
      },
    },
    configureServer(server) {
      server.watcher.add(resolve(root, dir))
      server.watcher.on('change', (file) => {
        if (file.includes(`/${dir}/`)) {
          server.ws.send({ type: 'full-reload' })
        }
      })
    },
  }
}
