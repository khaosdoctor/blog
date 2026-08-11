/**
 * Publishes scheduled posts at their exact minute.
 *
 * The build emits /scheduled.json listing every post whose pubDate is still in
 * the future. This Worker runs on a one-minute cron, and when a post's pubDate
 * falls inside the minute that just passed it fires a repository_dispatch, which
 * rebuilds and deploys the site. The post is live within about a minute of the
 * time it was set to.
 *
 * Deliberately stateless: the window check means no KV, no dedupe bookkeeping,
 * and no way to get stuck. A missed cron run costs at most one late post, and
 * /scheduled.json is still correct on the next run.
 */
export type Env = {
  /** Fine-grained PAT with contents:write on the blog repo. */
  GITHUB_TOKEN: string
  /** e.g. "khaosdoctor/blog" */
  GITHUB_REPO: string
  /** e.g. "https://blog.lsantos.dev" */
  SITE_URL: string
}

type ScheduledPost = { slug: string; pubDate: string }

const WINDOW_MS = 60_000
const DISPATCH_EVENT = 'scheduled-publish'

async function readManifest(env: Env): Promise<ScheduledPost[]> {
  const response = await fetch(`${env.SITE_URL}/scheduled.json`, {
    headers: { accept: 'application/json' },
    cf: { cacheTtl: 0 },
  })
  if (!response.ok) throw new Error(`manifest fetch failed: HTTP ${response.status}`)
  const body = (await response.json()) as { posts?: ScheduledPost[] }
  return body.posts ?? []
}

export function dueNow(posts: ScheduledPost[], now: number): ScheduledPost[] {
  return posts.filter((post) => {
    const at = Date.parse(post.pubDate)
    if (Number.isNaN(at)) return false
    return at > now - WINDOW_MS && at <= now
  })
}

async function dispatch(env: Env, slugs: string[]): Promise<void> {
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'content-type': 'application/json',
      'user-agent': 'blog-scheduler-worker',
      'x-github-api-version': '2022-11-28',
    },
    body: JSON.stringify({ event_type: DISPATCH_EVENT, client_payload: { slugs } }),
  })
  if (!response.ok) {
    throw new Error(`dispatch failed: HTTP ${response.status} ${await response.text()}`)
  }
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const posts = await readManifest(env)
        const due = dueNow(posts, Date.now())
        if (due.length === 0) return
        await dispatch(
          env,
          due.map((post) => post.slug),
        )
        console.log(`dispatched build for: ${due.map((post) => post.slug).join(', ')}`)
      })(),
    )
  },

  /**
   * A tiny status endpoint, handy for checking what the Worker can see without
   * waiting for a cron tick. It exposes only what is already public.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname !== '/status') return new Response('not found', { status: 404 })
    const posts = await readManifest(env).catch((error: Error) => error)
    if (posts instanceof Error) {
      return Response.json({ ok: false, error: posts.message }, { status: 502 })
    }
    return Response.json({
      ok: true,
      now: new Date().toISOString(),
      upcoming: posts.slice(0, 20),
      dueThisMinute: dueNow(posts, Date.now()).map((post) => post.slug),
    })
  },
} satisfies ExportedHandler<Env>
