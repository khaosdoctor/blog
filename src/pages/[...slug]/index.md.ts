import { markdownTwinRoute } from '../../lib/markdown-twin'
import { markdownTwinPaths } from '../../lib/routes'

export const getStaticPaths = markdownTwinPaths('pt')

export const GET = markdownTwinRoute
