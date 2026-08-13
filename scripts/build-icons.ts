// Regenerates public/icons from the favicon. Run when the mark changes.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { bold, count, dim, heading, ok } from './lib/cli.ts'

const SOURCE = 'public/favicon.svg'
const OUT_DIR = 'public/icons'

const PAPER = '#fffdf9'

interface Icon {
  name: string
  size: number
  /** Fraction of the canvas the artwork covers. */
  scale: number
  background: string
}

const ICONS: Icon[] = [
  { name: 'icon-192.png', size: 192, scale: 0.8, background: PAPER },
  { name: 'icon-512.png', size: 512, scale: 0.8, background: PAPER },
  // Cropped by the launcher, so the artwork stays well inside the safe area.
  { name: 'icon-512-maskable.png', size: 512, scale: 0.6, background: PAPER },
  // iOS ignores the manifest and looks for this one, and it never gets a
  // transparent background, so it is drawn on paper like the rest.
  { name: 'apple-touch-icon.png', size: 180, scale: 0.75, background: PAPER },
]

heading(`build-icons: rendering ${ICONS.length} sizes from ${SOURCE}`)

const svg = readFileSync(SOURCE, 'utf8')

mkdirSync(OUT_DIR, { recursive: true })

for (const icon of ICONS) {
  const inner = Math.round(icon.size * icon.scale)
  const pad = Math.round((icon.size - inner) / 2)

  const artwork = await sharp(Buffer.from(svg)).resize(inner, inner).png().toBuffer()

  const composed = await sharp({
    create: {
      width: icon.size,
      height: icon.size,
      channels: 4,
      background: icon.background,
    },
  })
    .composite([{ input: artwork, top: pad, left: pad }])
    .png()
    .toBuffer()

  writeFileSync(join(OUT_DIR, icon.name), composed)
  console.log(`  ${bold(icon.name)} ${icon.size}x${icon.size} ${dim(`(${composed.length} bytes)`)}`)
}

ok(`wrote ${count(ICONS.length, 'icon', 'icons')} to ${OUT_DIR}`)
