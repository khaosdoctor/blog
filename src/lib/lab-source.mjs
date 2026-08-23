import { dirname, relative, sep } from 'node:path'

/**
 * How a lab demo's file is addressed from the directory holding the posts:
 * `theme-lab-arquivo/components/CoverLab.vue`. The remark plugin derives the
 * link from the post it is rewriting, the loader from the file it found, and
 * both have to agree or the link 404s.
 */
export function labSourceId(postDir, path) {
  return relative(dirname(postDir), path).split(sep).join('/')
}

export function labSourceUrl(id) {
  return `/lab-source/${encodeURI(id)}.html`
}
