// Sizes of a Vite build, for the before/after comparison in eval/README.md.
//
//   node eval/bundle-size.mjs <label>=<dist directory> ...
//
// "Initial" is what index.html itself asks for: its script and stylesheet tags and the
// modulepreload links. "All" is every file under assets/, including chunks that load later.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

function measure(dist) {
  const html = readFileSync(join(dist, 'index.html'), 'utf8')
  const initial = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map((match) => match[1])
  const all = readdirSync(join(dist, 'assets')).map((name) => `assets/${name}`)
  const size = (files, extension) => {
    let raw = 0
    let gzip = 0
    for (const file of files.filter((name) => name.endsWith(extension))) {
      const content = readFileSync(join(dist, file))
      raw += content.length
      gzip += gzipSync(content).length
    }
    return { raw, gzip }
  }
  return {
    initialJs: size(initial, '.js'),
    allJs: size(all, '.js'),
    css: size(all, '.css'),
    jsFiles: all.filter((name) => name.endsWith('.js')).length,
  }
}

console.log('| 빌드 | 첫 화면 JS | 첫 화면 JS (gzip) | 전체 JS | 전체 JS (gzip) | JS 파일 | CSS (gzip) |')
console.log('|---|---|---|---|---|---|---|')
for (const argument of process.argv.slice(2)) {
  const [label, dist] = argument.split('=')
  const m = measure(dist)
  console.log(
    `| ${label} | ${kb(m.initialJs.raw)} | ${kb(m.initialJs.gzip)} | ${kb(m.allJs.raw)} | ${kb(m.allJs.gzip)} | ${m.jsFiles} | ${kb(m.css.gzip)} |`,
  )
}
