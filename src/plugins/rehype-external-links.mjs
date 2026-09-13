import { walkElements } from './mdx-util.mjs'

const SITE_HOST = 'blog.lsantos.dev'
export function rehypeExternalLinks() {
  return (tree) => {
    walkElements(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'a') return

      const href = node.properties?.href
      if (typeof href !== 'string' || !href.startsWith('http')) return

      let url
      try {
        url = new URL(href)
      } catch {
        return
      }
      if (url.hostname === SITE_HOST || url.hostname === `www.${SITE_HOST}`) return

      node.properties.target = '_blank'
      const existing = typeof node.properties.rel === 'string' ? node.properties.rel.split(/\s+/) : []
      for (const v of ['noopener', 'noreferrer']) {
        if (!existing.includes(v)) existing.push(v)
      }
      node.properties.rel = existing.join(' ')

      url.searchParams.set('utm_source', 'blog.lsantos.dev')
      url.searchParams.set('utm_medium', 'referral')
      node.properties.href = url.toString()
    })
  }
}
