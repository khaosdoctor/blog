// Captions are trusted-author HTML, never user input, so a denylist of
// executable tags is enough. URL schemes use an allowlist instead.
const TAGS_WITH_CONTENT = /<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi
const DANGEROUS_TAGS = /<\/?(script|style|iframe|object|embed|link|meta)\b[^>]*>/gi
// The tokenizer starts an attribute on `/` as on whitespace: `<svg/onload=x>`.
const EVENT_HANDLER_ATTR = /[\s/]+on[a-z0-9_:.-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const URI_ATTR = /[\s/]+(?:href|src)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
// Three groups so only the attribute part loses bare slashes.
const TAG_PARTS = /(<\/?[a-z][a-z0-9]*)((?:[\s/][^>]*?)??)(\/?>)/gi
const ATTR_VALUE_OR_SLASH = /"[^"]*"|'[^']*'|=[^\s>]*|\//g

const SAFE_SCHEME = /^(?:https:|mailto:|#|\/)/i
// No colon means no scheme; no ampersand means `&colon;` cannot become one.
const SAFE_RELATIVE = /^[^:&]*$/

// Normalises a URL the way a browser does before it sniffs the scheme.
function decodeUriValue(value: string): string {
  return value
    .replace(/^["']|["']$/g, '')
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&tab;/gi, '\t')
    .replace(/&newline;/gi, '\n')
    .replace(/[\t\r\n]/g, '')
}

/** Allowlist, so the next encoding nobody thought of fails closed. */
function isSafeUri(value: string): boolean {
  return SAFE_SCHEME.test(value) || SAFE_RELATIVE.test(value)
}

function stripAttributeSlashes(interior: string): string {
  return interior.replace(ATTR_VALUE_OR_SLASH, (part) => (part === '/' ? '' : part))
}

export function sanitizeCaption(html: string): string {
  return html
    .replace(TAGS_WITH_CONTENT, '')
    .replace(DANGEROUS_TAGS, '')
    .replace(EVENT_HANDLER_ATTR, '')
    .replace(URI_ATTR, (match, value) => (isSafeUri(decodeUriValue(value)) ? match : ''))
    .replace(TAG_PARTS, (_, name, interior, close) => `${name}${stripAttributeSlashes(interior)}${close}`)
}
