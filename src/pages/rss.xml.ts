import type { APIRoute } from 'astro'
import { feedRoute } from '../lib/feed'

export const GET: APIRoute = feedRoute('pt')
