import assert from 'node:assert/strict'
import test from 'node:test'
import worker, { dueNow, type Env } from './index.ts'

/**
 * The window check is the whole scheduler: it is what lets the Worker stay
 * stateless. Get it wrong in one direction and a post publishes late or never;
 * get it wrong in the other and every cron tick rebuilds the site forever.
 */
const NOON = Date.parse('2026-08-11T12:00:00.000Z')
const at = (iso: string) => ({ slug: iso, pubDate: iso })

test('publishes a post whose time fell inside the minute that just passed', () => {
  const due = dueNow([at('2026-08-11T11:59:30.000Z')], NOON)
  assert.deepEqual(
    due.map((post) => post.slug),
    ['2026-08-11T11:59:30.000Z'],
  )
})

test('publishes a post due exactly now', () => {
  assert.equal(dueNow([at('2026-08-11T12:00:00.000Z')], NOON).length, 1)
})

test('does not publish a post that is still in the future', () => {
  assert.equal(dueNow([at('2026-08-11T12:00:30.000Z')], NOON).length, 0)
})

test('does not republish a post older than the window', () => {
  // Without this the Worker would fire a build on every tick, forever.
  assert.equal(dueNow([at('2026-08-11T11:58:00.000Z')], NOON).length, 0)
})

test('ignores an unparseable date instead of throwing', () => {
  assert.equal(dueNow([{ slug: 'broken', pubDate: 'not a date' }], NOON).length, 0)
})

test('handles several posts due in the same minute', () => {
  const due = dueNow([at('2026-08-11T11:59:10.000Z'), at('2026-08-11T11:59:50.000Z')], NOON)
  assert.equal(due.length, 2)
})

/**
 * The tests above hand a fixed instant straight to dueNow, so they say nothing
 * about which instant the handler picks. That is where the interesting failure
 * lives: Cloudflare may start the tick for 12:00 well after 12:00, and the
 * manifest fetch pushes the wall clock further still.
 */
test('a late tick still publishes the post on its window boundary', async () => {
  const env: Env = {
    GITHUB_TOKEN: 'token',
    GITHUB_REPO: 'khaosdoctor/blog',
    SITE_URL: 'https://blog.example',
  }
  const boundary = '2026-08-11T12:00:00.000Z'
  const dispatched: string[][] = []
  const pending: Promise<unknown>[] = []
  const realFetch = globalThis.fetch
  const realNow = Date.now

  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    if (String(input).endsWith('/scheduled.json')) {
      return new Response(JSON.stringify({ posts: [at(boundary)] }))
    }
    const body = JSON.parse(String(init?.body)) as { client_payload: { slugs: string[] } }
    dispatched.push(body.client_payload.slugs)
    return new Response('{}')
  }) as typeof globalThis.fetch
  // The tick fires 65s late, so wall clock has already left this post behind.
  Date.now = () => NOON + 65_000

  try {
    const controller = { scheduledTime: NOON, cron: '* * * * *', noRetry: () => {} }
    const ctx = {
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      passThroughOnException: () => {},
    }
    await worker.scheduled(controller as unknown as ScheduledController, env, ctx as unknown as ExecutionContext)
    await Promise.all(pending)
  } finally {
    globalThis.fetch = realFetch
    Date.now = realNow
  }

  assert.deepEqual(dispatched, [[boundary]])
})
