/**
 * Makes the cover for a post.
 *
 *   node scripts/cover.ts <slug> [--bg url] [--prompt text] [--seed n] [--n 4] [--pick 2]
 *
 * Two steps. Replicate's flux-dev paints a background from the post title, you
 * pick one of them, and the cover service (a separate Deno + Satori app) draws
 * the title over it and returns the PNG, which is written to
 * content/blog/<slug>/cover.png and set as heroImage.
 *
 * Needs COVER_SERVICE_URL, the root of that service, and REPLICATE_API_TOKEN.
 * The token is only read when generating: --bg <url> skips step one, so an
 * Unsplash link and a generated background take the same path from there on.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { setTimeout as sleep } from 'node:timers/promises'
import { parseArgs } from 'node:util'

const SOURCE_DIR = 'content/blog'
const MODEL = 'black-forest-labs/flux-dev'
const ROUTE = '/blog/articles'

const STYLE =
  'abstract cypherpunk artwork in the spirit of Neuromancer, dense ASCII-art texture, glitched terminal glyphs, circuit traces dissolving into static, neon cyan and magenta over near-black, high contrast, grainy print, no text, no letters, no numbers, no logo, no watermark'

interface Prediction {
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string[]
  error?: string
  urls: { get: string }
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function frontmatterOf(raw: string): string {
  return /^---\n([\s\S]*?)\n---/.exec(raw)?.[1] ?? ''
}

function field(frontmatter: string, key: string): string | null {
  const match = new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(frontmatter)
  if (match === null) return null
  return match[1].trim().replace(/^["'](.*)["']$/, '$1')
}

async function generate(token: string, prompt: string, count: number, seed: number | undefined): Promise<string[]> {
  const input: Record<string, unknown> = {
    prompt,
    num_outputs: count,
    aspect_ratio: '16:9',
    // Satori decodes the background itself and does not read webp, flux's default.
    output_format: 'jpg',
  }
  if (seed !== undefined) input.seed = seed

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // Prefer: wait holds the response open until the prediction finishes, up to a
  // minute, which is long enough for most runs and skips the polling entirely.
  const created = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'wait' },
    body: JSON.stringify({ input }),
  })

  if (!created.ok) fail(`Replicate rejected the request: ${created.status} ${await created.text()}`)

  let prediction = (await created.json()) as Prediction
  while (prediction.status === 'starting' || prediction.status === 'processing') {
    await sleep(2000)
    const polled = await fetch(prediction.urls.get, { headers })
    prediction = (await polled.json()) as Prediction
  }

  if (prediction.status !== 'succeeded' || prediction.output === undefined) {
    fail(`Generation ${prediction.status}: ${prediction.error ?? 'no output'}`)
  }

  return prediction.output
}

async function ask(count: number): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`Pick one (1-${count}): `)
  rl.close()
  return answer
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    bg: { type: 'string' },
    prompt: { type: 'string' },
    seed: { type: 'string' },
    n: { type: 'string' },
    pick: { type: 'string' },
  },
})

const slug =
  positionals[0] ?? fail('Usage: node scripts/cover.ts <slug> [--bg url] [--prompt text] [--seed n] [--n 4] [--pick 2]')

const dir = join(SOURCE_DIR, slug)
const postFile = ['index.mdx', 'index.md'].map((name) => join(dir, name)).find(existsSync) ?? fail(`No post at ${dir}.`)

const raw = readFileSync(postFile, 'utf8')
const frontmatter = frontmatterOf(raw)
const title = field(frontmatter, 'title') ?? fail(`${postFile} has no title in its frontmatter.`)
const section = field(frontmatter, 'category') ?? ''

const serviceUrl = process.env.COVER_SERVICE_URL
if (serviceUrl === undefined || serviceUrl.length === 0) {
  fail('COVER_SERVICE_URL is not set. Point it at the deployed cover service, e.g. https://covers.example.dev')
}

async function background(): Promise<string> {
  if (values.bg !== undefined) return values.bg

  const token = process.env.REPLICATE_API_TOKEN
  if (token === undefined || token.length === 0) {
    fail('REPLICATE_API_TOKEN is not set. Set it, or pass --bg <url> to use a background you already have.')
  }

  const prompt = values.prompt ?? `${title}. ${STYLE}`
  const count = Number.parseInt(values.n ?? '4', 10)
  const seed = values.seed === undefined ? undefined : Number.parseInt(values.seed, 10)

  console.log(`Generating ${count} backgrounds for "${title}"`)
  const urls = await generate(token, prompt, count, seed)
  for (const [index, url] of urls.entries()) console.log(`  ${index + 1}. ${url}`)

  const answer = values.pick ?? (await ask(urls.length))
  const picked = urls[Number.parseInt(answer, 10) - 1]
  if (picked === undefined) fail(`${answer} is not one of the ${urls.length} images.`)

  return picked
}

const image = await background()

// The template reads title and image; section rides along for when it uses it.
const query = new URLSearchParams({ title, image, section })
const cover = await fetch(`${serviceUrl.replace(/\/+$/, '')}${ROUTE}?${query}`)
if (!cover.ok) fail(`Cover service returned ${cover.status}: ${await cover.text()}`)

const target = join(dir, 'cover.png')
writeFileSync(target, Buffer.from(await cover.arrayBuffer()))
console.log(`wrote ${target}`)

if (/^heroImage:/m.test(frontmatter)) {
  console.log(`${postFile} already sets heroImage, left alone`)
  process.exit(0)
}

writeFileSync(
  postFile,
  raw.replace(/^---\n([\s\S]*?)\n---/, (_, fm: string) => `---\n${fm}\nheroImage: "./cover.png"\n---`),
)
console.log('set heroImage: "./cover.png"')
