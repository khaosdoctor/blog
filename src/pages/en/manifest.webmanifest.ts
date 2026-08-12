import type { APIRoute } from 'astro'
import { buildManifest, MANIFEST_HEADERS } from '../../lib/manifest'

export const GET: APIRoute = () => new Response(buildManifest('en'), { headers: MANIFEST_HEADERS })
