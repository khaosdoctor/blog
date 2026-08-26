import { markdownTwinRoute } from '../../../lib/markdown-twin'
import { markdownTwinPaths } from '../../../lib/routes'

export const getStaticPaths = markdownTwinPaths('en')

export const GET = markdownTwinRoute
