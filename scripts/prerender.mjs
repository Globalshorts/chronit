import fs from 'fs'
import path from 'path'

try {
  const dir = 'dist-server/assets'
  const file = fs.readdirSync(dir).find(f => /^entry-server-.*\.js$/.test(f))
  if (!file) throw new Error('SSR bundle not found in ' + dir)
  const mod = await import(path.resolve(dir, file))
  const html = mod.render()
  if (!html || html.length < 5000) throw new Error('SSR html too short: ' + (html ? html.length : 0))
  let index = fs.readFileSync('dist/index.html', 'utf8')
  const re = /<div id="boot-splash">[\s\S]*?<\/div>/
  if (!re.test(index)) throw new Error('boot-splash marker not found')
  index = index.replace(re, html)
  fs.writeFileSync('dist/index.html', index)
  console.log('[prerender] OK — injected', html.length, 'chars')
} catch (e) {
  console.error('[prerender] SKIPPED (fallback to splash):', e.message)
}
process.exit(0)
