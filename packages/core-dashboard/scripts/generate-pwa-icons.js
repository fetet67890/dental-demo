// One-off generator for PWA manifest icons. Run with: node scripts/generate-pwa-icons.js
// Draws a simple branded tooth glyph on the app's navy brand color — no external
// image assets or network calls needed.
const sharp = require('sharp')
const path = require('path')

const BG = '#122056'
const FG = '#FFFFFF'

// A simple two-root tooth silhouette, drawn with basic shapes (crown + two roots)
// so it renders identically regardless of installed system fonts.
function toothSvg(size, { padding = 0, rounded = true } = {}) {
  const s = size
  const r = rounded ? s * 0.22 : 0
  const cx = s / 2
  const crownW = s * 0.5
  const crownH = s * 0.34
  const crownY = s * 0.28
  const crownRx = crownW * 0.32

  return `
<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${s}" height="${s}" rx="${r}" fill="${BG}"/>
  <g transform="translate(${padding},${padding})">
    <rect x="${cx - crownW / 2}" y="${crownY}" width="${crownW}" height="${crownH}" rx="${crownRx}" fill="${FG}"/>
    <path d="
      M ${cx - crownW / 2 + crownW * 0.12} ${crownY + crownH - 2}
      C ${cx - crownW / 2 + crownW * 0.05} ${crownY + crownH + s * 0.22}, ${cx - crownW * 0.10} ${crownY + crownH + s * 0.24}, ${cx - crownW * 0.06} ${crownY + crownH + s * 0.10}
      C ${cx - crownW * 0.02} ${crownY + crownH + s * 0.02}, ${cx} ${crownY + crownH - 4}, ${cx} ${crownY + crownH - 4}
      C ${cx} ${crownY + crownH - 4}, ${cx + crownW * 0.02} ${crownY + crownH + s * 0.02}, ${cx + crownW * 0.06} ${crownY + crownH + s * 0.10}
      C ${cx + crownW * 0.10} ${crownY + crownH + s * 0.24}, ${cx + crownW / 2 - crownW * 0.05} ${crownY + crownH + s * 0.22}, ${cx + crownW / 2 - crownW * 0.12} ${crownY + crownH - 2}
      Z" fill="${FG}"/>
  </g>
</svg>`
}

async function run() {
  const outDir = path.join(__dirname, '..', 'public', 'icons')

  const targets = [
    { file: 'icon-192.png', size: 192, padding: 0 },
    { file: 'icon-512.png', size: 512, padding: 0 },
    // Maskable icons need a safe-zone margin (~10%) since OSes crop to various shapes
    { file: 'icon-maskable-512.png', size: 512, padding: 51 },
  ]

  for (const t of targets) {
    const svg = Buffer.from(toothSvg(t.size, { padding: t.padding }))
    await sharp(svg).png().toFile(path.join(outDir, t.file))
    console.log(`✅ ${t.file}`)
  }
}

run().catch(err => { console.error(err); process.exit(1) })
