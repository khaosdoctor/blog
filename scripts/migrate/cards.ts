/**
 * Turndown rules for Ghost's Koenig cards, one rule per card kind the export
 * actually contains. The inventory (scripts/analyze-export.ts) found exactly
 * these nine: image, bookmark, embed, header, signup, callout, button, code,
 * video. Anything else showing up is a bug, not a missing feature.
 *
 * Every rule converts the RENDERED html, never the mobiledoc/lexical source.
 */
import type TurndownService from 'turndown'

export type CardContext = {
  /** Rewrites a Ghost asset URL to the colocated relative path, or keeps it remote. */
  resolveAsset: (url: string) => string
  /** Collects anything a human should look at afterwards. */
  note: (message: string) => void
}

const CALLOUT_TYPES: Record<string, string> = {
  blue: 'NOTE',
  green: 'TIP',
  yellow: 'WARNING',
  red: 'CAUTION',
  purple: 'IMPORTANT',
  grey: 'NOTE',
  gray: 'NOTE',
  white: 'NOTE',
  accent: 'NOTE',
}

const COURSE_HOST = 'formacaots.com.br'

function attr(node: Element, name: string): string {
  return node.getAttribute(name)?.trim() ?? ''
}

function text(node: Element | null): string {
  return node?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

/** MDX chokes on raw braces and unescaped angle brackets in text positions. */
export function escapeForMdx(value: string): string {
  return value.replace(/([{}<>])/g, '\\$1')
}

function quote(value: string): string {
  return value.replace(/"/g, '&quot;')
}

/**
 * Turndown parses with domino, whose NodeList is array-like but NOT iterable and
 * whose nodes have no .remove(). Everything DOM-ish has to go through these.
 */
function q(node: Element, selector: string): Element | null {
  return node.querySelector(selector) ?? null
}

function queryAll(node: Element, selector: string): Element[] {
  return Array.prototype.slice.call(node.querySelectorAll(selector)) as Element[]
}

function detach(node: Element): void {
  node.parentNode?.removeChild(node)
}

function firstMatch(node: Element, selectors: string[]): Element | null {
  for (const selector of selectors) {
    const found = q(node, selector)
    if (found !== null) return found
  }
  return null
}

/** YouTube/Vimeo ids out of any of the URL shapes Ghost embedded over the years. */
export function youtubeId(url: string): string | null {
  const match =
    /(?:youtube\.com\/(?:embed\/|watch\?v=|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url)
  return match === null ? null : match[1]
}

export function vimeoId(url: string): string | null {
  const match = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url)
  return match === null ? null : match[1]
}

/**
 * Ghost renders markdown-it footnotes to a `<sup class="footnote-ref">` marker
 * plus a `<section class="footnotes">` list. Both go back to GFM `[^n]` syntax,
 * which remark-gfm renders and Obsidian understands.
 */
export function addFootnoteRules(turndown: TurndownService): void {
  turndown.addRule('footnote-ref', {
    filter: (node) => node.nodeName === 'SUP' && node.className?.includes?.('footnote-ref') === true,
    replacement: (_content, node) => {
      const element = node as unknown as Element
      const id = q(element, 'a')?.getAttribute('href')?.replace('#fn', '') ?? ''
      if (id.length === 0) return ''
      return `[^${id}]`
    },
  })

  turndown.addRule('footnote-section', {
    filter: (node) =>
      (node.nodeName === 'SECTION' || node.nodeName === 'DIV') &&
      node.className?.includes?.('footnotes') === true,
    replacement: (_content, node) => {
      const element = node as unknown as Element
      const items = queryAll(element, 'li')
      if (items.length === 0) return ''
      const definitions: string[] = []
      for (const item of items) {
        const id = item.getAttribute('id')?.replace('fn', '') ?? String(definitions.length + 1)
        // Drop the ↩︎ backreference, remark generates its own.
        for (const backref of queryAll(item, 'a.footnote-backref')) detach(backref)
        const text = turndown.turndown(item.innerHTML).replace(/\s+/g, ' ').trim()
        definitions.push(`[^${id}]: ${text}`)
      }
      return `\n\n${definitions.join('\n')}\n\n`
    },
  })

  // The <hr class="footnotes-sep"> before the list is Ghost chrome, not content.
  turndown.addRule('footnote-sep', {
    filter: (node) => node.nodeName === 'HR' && node.className?.includes?.('footnotes-sep') === true,
    replacement: () => '',
  })
}

/**
 * Ghost's older editor emitted tables with no `<th>` at all. turndown-plugin-gfm
 * only converts a table it can find a header row for, so those fell through to
 * the escaper and rendered as literal `\<table>\<tbody>...` tag soup in the
 * post. This promotes the first row to the header, which is what the table
 * meant anyway.
 */
export function addTableRule(turndown: TurndownService): void {
  turndown.addRule('headerless-table', {
    // q() matters: domino's querySelector returns undefined, not null.
    filter: (node) => node.nodeName === 'TABLE' && q(node as unknown as Element, 'th') === null,
    replacement: (_content, node) => {
      const element = node as unknown as Element
      const rows = queryAll(element, 'tr')
      if (rows.length === 0) return ''
      const cells = (row: Element): string[] =>
        queryAll(row, 'td, th').map((cell) => turndown.turndown(cell.innerHTML).replace(/\s*\n\s*/g, ' ').trim())
      const header = cells(rows[0])
      if (header.length === 0) return ''
      const body = rows.slice(1).map(cells)
      const line = (values: string[]): string => `| ${values.join(' | ')} |`
      const separator = `| ${header.map(() => '---').join(' | ')} |`
      return `\n\n${[line(header), separator, ...body.map(line)].join('\n')}\n\n`
    },
  })

  /**
   * `<code><a href=...>text</a></code>` came out as a markdown link trapped
   * inside a code span, which renders as literal `[text](url)`. The link is the
   * point, so keep it and put the code formatting on its label.
   */
  turndown.addRule('code-wrapped-link', {
    filter: (node) => {
      if (node.nodeName !== 'CODE') return false
      const element = node as unknown as Element
      const links = queryAll(element, 'a')
      return links.length === 1 && text(element) === text(links[0])
    },
    replacement: (_content, node) => {
      const link = q(node as unknown as Element, 'a')
      if (link === null) return ''
      return `[\`${text(link)}\`](${attr(link, 'href')})`
    },
  })
}

export function addCardRules(turndown: TurndownService, ctx: CardContext): void {
  // --------------------------------------------------------------- image card
  turndown.addRule('kg-image-card', {
    filter: (node) => node.nodeName === 'FIGURE' && node.className.includes('kg-image-card'),
    replacement: (_content, node) => {
      const element = node as unknown as Element
      const img = q(element, 'img')
      if (img === null) return ''
      const src = ctx.resolveAsset(attr(img, 'src'))
      const alt = attr(img, 'alt')
      const caption = q(element, 'figcaption')
      // An animated GIF was converted to a video during asset resolution.
      if (src.endsWith('.mp4')) {
        const videoCaption = caption === null ? alt : caption.textContent?.trim() ?? alt
        const captionPart = videoCaption.length === 0 ? '' : ` caption="${quote(videoCaption)}"`
        return `\n\n<Video src="${src}"${captionPart} />\n\n`
      }
      const wide = element.className.includes('kg-width-wide') || element.className.includes('kg-width-full')
      // No caption and no special width: plain markdown keeps the file readable in Obsidian.
      if (caption === null && !wide) return `\n\n![${alt}](${src})\n\n`
      const captionAttr = caption === null ? '' : ` caption="${quote(caption.innerHTML.trim())}"`
      const wideAttr = wide ? ' wide' : ''
      return `\n\n<Figure src="${src}" alt="${quote(alt)}"${captionAttr}${wideAttr} />\n\n`
    },
  })

  // ------------------------------------------------------------ bookmark card
  turndown.addRule('kg-bookmark-card', {
    filter: (node) => node.className?.includes?.('kg-bookmark-card') === true,
    replacement: (_content, node) => {
      const element = node as unknown as Element
      const link = q(element, 'a.kg-bookmark-container, a')
      const href = link === null ? '' : attr(link, 'href')
      if (href.length === 0) return ''
      // LinkPreview fetches OG data at build and needs an absolute URL. A
      // bookmark pointing at this same blog has no OG data worth fetching
      // anyway, so it degrades to a plain link with the card's own title.
      // A link to this same blog is rewritten to a root-relative path later,
      // which LinkPreview cannot fetch, so keep those as ordinary links.
      const internal = !/^https?:\/\//.test(href) || /^https?:\/\/blog\.lsantos\.dev/.test(href)
      if (internal) {
        const title = text(q(element, '.kg-bookmark-title')) || href
        return `\n\n[${escapeForMdx(title)}](${href})\n\n`
      }
      // Carry Ghost's own cached metadata across: it means the build never has
      // to reach the network to render a bookmark.
      const title = text(q(element, '.kg-bookmark-title'))
      const description = text(q(element, '.kg-bookmark-description'))
      const publisher = text(q(element, '.kg-bookmark-publisher'))
      const attrs = [
        `url="${quote(href)}"`,
        title.length === 0 ? '' : `title="${quote(title)}"`,
        description.length === 0 ? '' : `description="${quote(description)}"`,
        publisher.length === 0 ? '' : `publisher="${quote(publisher)}"`,
      ].filter((part) => part.length > 0)
      return `\n\n<Bookmark ${attrs.join(' ')} />\n\n`
    },
  })

  // --------------------------------------------------------------- embed card
  turndown.addRule('kg-embed-card', {
    filter: (node) => node.className?.includes?.('kg-embed-card') === true,
    replacement: (_content, node) => {
      const element = node as unknown as Element
      const iframe = q(element, 'iframe')
      const caption = text(q(element, 'figcaption'))
      const captionAttr = caption.length === 0 ? '' : ` caption="${quote(caption)}"`
      if (iframe === null) {
        const blockquote = q(element, 'blockquote')
        // Ghost cached the tweet's text in the blockquote. Rendering that as a
        // real quote keeps the build offline and the page JS-free; an embedded
        // tweet would need Twitter's script at read time and its oEmbed API at
        // build time, and both are unreliable now.
        if (blockquote !== null) {
          const status = queryAll(blockquote, 'a').find((link) =>
            /(?:twitter|x)\.com\/[^/]+\/status\/\d+/.test(attr(link, 'href')),
          )
          const body = turndown
            .turndown(blockquote.innerHTML)
            .replace(/\s+/g, ' ')
            .trim()
          if (body.length > 0) {
            const source = status === undefined ? '' : `\n>\n> — [via Twitter](${attr(status, 'href')})`
            const quoted = body
              .split('\n')
              .map((line) => `> ${line}`.trimEnd())
              .join('\n')
            return `\n\n${quoted}${source}\n\n`
          }
        }
        ctx.note(`embed card without iframe kept as raw html`)
        return `\n\n<RawEmbed title="Conteúdo incorporado" html="${quote(element.innerHTML.trim())}"${captionAttr} />\n\n`
      }
      const src = attr(iframe, 'src')
      const yt = youtubeId(src)
      if (yt !== null) return `\n\n<YouTube id="${yt}"${captionAttr} />\n\n`
      const vimeo = vimeoId(src)
      if (vimeo !== null) return `\n\n<Vimeo id="${vimeo}"${captionAttr} />\n\n`
      ctx.note(`raw embed kept: ${new URL(src, 'https://blog.lsantos.dev').host}`)
      return `\n\n<RawEmbed title="${quote(attr(iframe, 'title') || 'Conteúdo incorporado')}" html="${quote(iframe.outerHTML)}"${captionAttr} />\n\n`
    },
  })

  // ------------------------------------------------------------- callout card
  turndown.addRule('kg-callout-card', {
    filter: (node) => node.className?.includes?.('kg-callout-card') === true,
    replacement: (_content, node) => {
      const element = node as unknown as Element
      const colour = /kg-callout-card-([a-z]+)/.exec(element.className)?.[1] ?? 'grey'
      const type = CALLOUT_TYPES[colour] ?? 'NOTE'
      const emoji = text(q(element, '.kg-callout-emoji'))
      const body = q(element, '.kg-callout-text')
      // Keep the inner markdown: convert the text node's html, not its plain text.
      const inner = body === null ? '' : turndown.turndown(body.innerHTML).trim()
      const title = emoji.length === 0 ? '' : ` ${emoji}`
      const quoted = inner
        .split('\n')
        .map((line) => `> ${line}`.trimEnd())
        .join('\n')
      return `\n\n> [!${type}]${title}\n${quoted}\n\n`
    },
  })

  // -------------------------------------------------------------- header card
  turndown.addRule('kg-header-card', {
    filter: (node) =>
      node.className?.includes?.('kg-header-card') === true ||
      node.className?.includes?.('kg-product-card') === true,
    replacement: (_content, node) => {
      const element = node as unknown as Element
      const html = element.innerHTML
      if (html.includes(COURSE_HOST)) return `\n\n<CourseCTA />\n\n`
      const heading = text(firstMatch(element, ['h1', 'h2', 'h3', '.kg-header-card-header']))
      const sub = text(firstMatch(element, ['.kg-header-card-subheader', 'p']))
      const button = q(element, 'a')
      const link =
        button === null ? '' : `\n> \n> [${text(button)}](${attr(button, 'href')})`
      const lines = [heading, sub].filter((part) => part.length > 0).map(escapeForMdx)
      if (lines.length === 0 && link.length === 0) return ''
      ctx.note('header card flattened to a callout')
      return `\n\n> [!NOTE]\n${lines.map((line) => `> ${line}`).join('\n> \n')}${link}\n\n`
    },
  })

  // -------------------------------------------------------------- signup card
  // Dropped on purpose: members/newsletter are deferred, so a signup form has
  // nothing to submit to. <Subscribe> arrives with the newsletter project.
  turndown.addRule('kg-signup-card', {
    filter: (node) => node.className?.includes?.('kg-signup-card') === true,
    replacement: () => '',
  })

  // -------------------------------------------------------------- button card
  turndown.addRule('kg-button-card', {
    filter: (node) => node.className?.includes?.('kg-button-card') === true,
    replacement: (_content, node) => {
      const element = node as unknown as Element
      const link = q(element, 'a')
      if (link === null) return ''
      const href = attr(link, 'href')
      if (href.includes(COURSE_HOST)) return `\n\n<CourseCTA />\n\n`
      return `\n\n[${text(link)}](${href})\n\n`
    },
  })

  // ---------------------------------------------------------------- code card
  turndown.addRule('kg-code-card', {
    filter: (node) => node.className?.includes?.('kg-code-card') === true,
    replacement: (_content, node) => {
      const element = node as unknown as Element
      const code = q(element, 'code')
      if (code === null) return ''
      const lang = /language-([\w-]+)/.exec(code.className)?.[1] ?? ''
      const caption = text(q(element, 'figcaption'))
      const title = caption.length === 0 ? '' : ` title="${quote(caption)}"`
      return `\n\n\`\`\`${lang}${title}\n${code.textContent ?? ''}\n\`\`\`\n\n`
    },
  })

  // --------------------------------------------------------------- video card
  turndown.addRule('kg-video-card', {
    filter: (node) => node.className?.includes?.('kg-video-card') === true,
    replacement: (_content, node) => {
      const element = node as unknown as Element
      const video = q(element, 'video')
      const source = video?.getAttribute('src') ?? q(element, 'source')?.getAttribute('src') ?? ''
      if (source.length === 0) return ''
      const poster = video?.getAttribute('poster') ?? ''
      const caption = text(q(element, 'figcaption'))
      const posterAttr = poster.length === 0 ? '' : ` poster="${ctx.resolveAsset(poster)}"`
      const captionAttr = caption.length === 0 ? '' : ` caption="${quote(caption)}"`
      return `\n\n<Video src="${ctx.resolveAsset(source)}"${posterAttr}${captionAttr} />\n\n`
    },
  })

  // ------------------------------------------------------------- toggle/audio
  // Not present in the export. Fail loudly instead of silently dropping content
  // if a future export contains one.
  turndown.addRule('kg-unknown-card', {
    filter: (node) => /\bkg-(toggle|audio|file|product|gallery|nft)-card\b/.test(node.className ?? ''),
    replacement: (content, node) => {
      const kind = /kg-([a-z]+)-card/.exec((node as unknown as Element).className)?.[1] ?? 'unknown'
      ctx.note(`UNHANDLED CARD: ${kind} — content kept as plain text, needs a human`)
      return `\n\n${content}\n\n`
    },
  })
}

/**
 * Ghost renders KaTeX to HTML but keeps the original TeX in a MathML
 * annotation, so the source is recoverable exactly instead of by hand.
 */
export function addMathRule(turndown: TurndownService, ctx: CardContext): void {
  turndown.addRule('katex', {
    filter: (node) => node.className?.includes?.('katex') === true && !node.className.includes('katex-'),
    replacement: (_content, node) => {
      const element = node as unknown as Element
      const tex = q(element, 'annotation[encoding="application/x-tex"]')?.textContent?.trim()
      if (tex === undefined || tex.length === 0) {
        ctx.note('KaTeX span without a TeX annotation, formula lost')
        return ''
      }
      const display = element.className.includes('katex-display')
      if (display) return `\n\n$$\n${tex}\n$$\n\n`
      return `$${tex}$`
    },
  })
}
