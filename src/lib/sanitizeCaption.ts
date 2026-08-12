// Captions come from migrated Ghost content and are trusted-author
// HTML (credit links, the odd <span style>), not user input, so a small
// denylist is enough here, no DOMPurify-class dependency needed. Strips the
// tags/attributes/URI schemes that could execute script; everything else
// (links, spans, formatting) passes through untouched.
const TAGS_WITH_CONTENT = /<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi
const DANGEROUS_TAGS = /<\/?(script|style|iframe|object|embed|link|meta)\b[^>]*>/gi
const EVENT_HANDLER_ATTR = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const URI_ATTR = /\s+(?:href|src)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
const UNSAFE_SCHEME = /^\s*(?:javascript|data):/i

// Decodes the handful of HTML character references an attacker can use to
// smuggle a scheme past a literal string match (numeric entities, and the
// named &Tab;/&NewLine; references browsers treat as insertable whitespace
// inside a URL), then strips raw control whitespace the same way a browser
// does before scheme-sniffing a URL.
function decodeUriValue(value: string): string {
  return value
    .replace(/^["']|["']$/g, '')
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&tab;/gi, '\t')
    .replace(/&newline;/gi, '\n')
    .replace(/[\t\r\n]/g, '')
}

export function sanitizeCaption(html: string): string {
  return html
    .replace(TAGS_WITH_CONTENT, '')
    .replace(DANGEROUS_TAGS, '')
    .replace(EVENT_HANDLER_ATTR, '')
    .replace(URI_ATTR, (match, value) => (UNSAFE_SCHEME.test(decodeUriValue(value)) ? '' : match))
}
