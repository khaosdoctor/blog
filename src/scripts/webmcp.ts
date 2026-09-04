import type { WebmcpData, WebmcpPost } from '../lib/webmcp-data'
import { loadPagefind } from './pagefind'

const AUTHOR = {
  name: 'Lucas Santos',
  bio: 'Lucas Santos writes about software development, TypeScript, JavaScript, containers, infrastructure and career, mostly in Portuguese, at blog.lsantos.dev.',
  links: {
    github: 'https://github.com/khaosdoctor',
    twitter: 'https://twitter.lsantos.dev',
    linkedin: 'https://linkedin.lsantos.dev',
    youtube: 'https://youtube.lsantos.dev',
  },
  site: 'https://blog.lsantos.dev',
}

function textResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }] }
}

function readWebmcpData(): WebmcpData {
  const el = document.getElementById('webmcp-data')
  if (el?.textContent === null || el?.textContent === undefined) return { posts: [], series: [] }
  return JSON.parse(el.textContent) as WebmcpData
}

function findPost(data: WebmcpData, slug: string, locale?: string): WebmcpPost | undefined {
  return data.posts.find((post) => post.slug === slug && (locale === undefined || post.locale === locale))
}

interface SearchPostsInput {
  query: string
  limit?: number
}

async function searchPosts(input: SearchPostsInput) {
  const pagefind = await loadPagefind()
  if (pagefind === null) return textResult({ error: 'Search index is not available in this environment.' })

  const { results } = await pagefind.search(input.query)
  const limit = input.limit ?? 10
  const matches = []
  for (const result of results.slice(0, limit)) {
    const data = await result.data()
    matches.push({ url: data.url, title: data.meta.title ?? data.url, excerpt: data.excerpt })
  }
  return textResult({ query: input.query, results: matches })
}

interface ListPostsInput {
  locale?: string
  category?: string
  series?: string
  tag?: string
}

function listPosts(data: WebmcpData, input: ListPostsInput) {
  const posts = data.posts.filter((post) => {
    if (input.locale !== undefined && post.locale !== input.locale) return false
    if (input.category !== undefined && post.category !== input.category) return false
    if (input.series !== undefined && post.series !== input.series) return false
    if (input.tag !== undefined && !post.tags.includes(input.tag)) return false
    return true
  })
  return textResult({ count: posts.length, posts })
}

interface GetPostInput {
  slug: string
  locale?: string
}

async function getPost(data: WebmcpData, input: GetPostInput) {
  const post = findPost(data, input.slug, input.locale)
  if (post === undefined) return textResult({ error: `No post found for slug "${input.slug}".` })

  const response = await fetch(`${post.url}index.md`)
  if (!response.ok) {
    return textResult({ error: `Could not fetch markdown for "${post.slug}" (status ${response.status}).` })
  }
  return textResult({ ...post, markdown: await response.text() })
}

interface GetFootnotesInput {
  slug: string
  locale?: string
}

interface Footnote {
  number: string
  text: string
}

function parseFootnotes(html: string): { referenceCount: number; footnotes: Footnote[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const footnotes: Footnote[] = []

  for (const aside of doc.querySelectorAll('.footnote-aside')) {
    const head = aside.querySelector('.footnote-aside-head')
    const number = head?.textContent?.replace(/[[\]]/g, '').trim() ?? ''
    const clone = aside.cloneNode(true) as Element
    clone.querySelector('.footnote-aside-head')?.remove()
    footnotes.push({ number, text: clone.textContent?.trim() ?? '' })
  }

  return { referenceCount: doc.querySelectorAll('[data-footnote-ref]').length, footnotes }
}

async function getFootnotes(data: WebmcpData, input: GetFootnotesInput) {
  const post = findPost(data, input.slug, input.locale)
  if (post === undefined) return textResult({ error: `No post found for slug "${input.slug}".` })

  const response = await fetch(post.url)
  if (!response.ok) {
    return textResult({ error: `Could not fetch "${post.slug}" (status ${response.status}).` })
  }
  return textResult({ slug: post.slug, ...parseFootnotes(await response.text()) })
}

interface GetSeriesInput {
  locale?: string
}

function getSeries(data: WebmcpData, input: GetSeriesInput) {
  const series = data.series
    .filter((entry) => input.locale === undefined || entry.locale === input.locale)
    .map((entry) => ({
      slug: entry.slug,
      name: entry.name,
      locale: entry.locale,
      posts: entry.postSlugs
        .map((slug) => findPost(data, slug, entry.locale))
        .filter((post): post is WebmcpPost => post !== undefined),
    }))
  return textResult({ count: series.length, series })
}

function getAuthorContext() {
  return textResult(AUTHOR)
}

export async function registerWebmcpTools(): Promise<void> {
  await import('@mcp-b/global')
  if (document.modelContext === undefined) return

  const data = readWebmcpData()

  await document.modelContext.registerTool({
    name: 'searchPosts',
    title: 'Search posts',
    description: 'Search blog posts by keyword using the site search index.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search keyword or phrase.' },
        limit: { type: 'number', description: 'Maximum number of results to return.' },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true },
    execute: (input) => searchPosts(input as SearchPostsInput),
  })

  await document.modelContext.registerTool({
    name: 'listPosts',
    title: 'List posts',
    description: 'List blog posts, optionally filtered by locale, category, series or tag.',
    inputSchema: {
      type: 'object',
      properties: {
        locale: { type: 'string', description: 'Filter by locale, "pt" or "en".' },
        category: { type: 'string', description: 'Filter by category name.' },
        series: { type: 'string', description: 'Filter by series slug.' },
        tag: { type: 'string', description: 'Filter by tag.' },
      },
    },
    annotations: { readOnlyHint: true },
    execute: (input) => listPosts(data, input as ListPostsInput),
  })

  await document.modelContext.registerTool({
    name: 'getPost',
    title: 'Get post',
    description: 'Get the full markdown content of a post by its slug.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'The post slug.' },
        locale: { type: 'string', description: 'The post locale, "pt" or "en".' },
      },
      required: ['slug'],
    },
    annotations: { readOnlyHint: true },
    execute: (input) => getPost(data, input as GetPostInput),
  })

  await document.modelContext.registerTool({
    name: 'getFootnotes',
    title: 'Get footnotes',
    description: 'Get the footnotes of a post by its slug.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'The post slug.' },
        locale: { type: 'string', description: 'The post locale, "pt" or "en".' },
      },
      required: ['slug'],
    },
    annotations: { readOnlyHint: true },
    execute: (input) => getFootnotes(data, input as GetFootnotesInput),
  })

  await document.modelContext.registerTool({
    name: 'getSeries',
    title: 'Get series',
    description: 'List all post series and their posts, optionally filtered by locale.',
    inputSchema: {
      type: 'object',
      properties: {
        locale: { type: 'string', description: 'Filter by locale, "pt" or "en".' },
      },
    },
    annotations: { readOnlyHint: true },
    execute: (input) => getSeries(data, input as GetSeriesInput),
  })

  await document.modelContext.registerTool({
    name: 'getAuthorContext',
    title: 'Get author context',
    description: 'Get structured information about the blog author.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    execute: () => getAuthorContext(),
  })
}

void registerWebmcpTools()
