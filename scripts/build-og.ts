// Generates the per-section social cards. Placeholders until the real design.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const OUT_DIR = 'public/og'
const WIDTH = 1200
const HEIGHT = 630
const PAPER = '#fffdf9'
const INK = '#1a1c20'

// One accent per section, taken from the brand mark's four colours.
const SECTIONS: Record<string, string> = {
  default: '#e30613',
  javascript: '#f5b200',
  typescript: '#0578be',
  infra: '#45b384',
  security: '#e30613',
  career: '#0578be',
  opinion: '#45b384',
  meta: '#1a1c20',
}

const mark = readFileSync('public/favicon.svg', 'utf8')

mkdirSync(OUT_DIR, { recursive: true })

for (const [name, accent] of Object.entries(SECTIONS)) {
  const logo = await sharp(Buffer.from(mark)).resize(150, 150).png().toBuffer()

  // No text: a rasteriser has no fonts guaranteed to be present, and a card
  // that fails to build is worse than one without a label.
  const canvas = sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: PAPER },
  }).composite([
    { input: logo, top: 190, left: 100 },
    {
      input: Buffer.from(
        `<svg width="${WIDTH}" height="24"><rect width="${WIDTH}" height="24" fill="${accent}"/></svg>`,
      ),
      top: HEIGHT - 24,
      left: 0,
    },
    {
      input: Buffer.from(
        `<svg width="420" height="8"><rect width="420" height="8" fill="${INK}"/></svg>`,
      ),
      top: 390,
      left: 100,
    },
  ])

  const png = await canvas.png().toBuffer()
  writeFileSync(join(OUT_DIR, `${name}.png`), png)
  console.log(`${name}.png ${WIDTH}x${HEIGHT} (${(png.length / 1024).toFixed(1)}kB)`)
}
