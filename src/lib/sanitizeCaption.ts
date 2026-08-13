// Captions come from migrated Ghost content and are trusted-author
// HTML (credit links, the odd <span style>), not user input, so a small
// denylist is enough here, no DOMPurify-class dependency needed. Strips the
// tags and attributes that could execute script; everything else (links, spans,
// formatting) passes through untouched. URLs are the exception: those are held to
// an allowlist of schemes, because a denylist there lost to entity encoding.
const TAGS_WITH_CONTENT = /<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi
const DANGEROUS_TAGS = /<\/?(script|style|iframe|object|embed|link|meta)\b[^>]*>/gi
// A `/` starts a new attribute for the HTML tokenizer exactly like whitespace
// does, so `<svg/onload=alert(1)>` and `<img src="x"/onerror=1>` are handlers
// even though nothing separates them from what came before.
const EVENT_HANDLER_ATTR = /[\s/]+on[a-z0-9_:.-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const URI_ATTR = /[\s/]+(?:href|src)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
// Splits a tag into name, attributes and closing so only the attribute part
// loses its bare slashes: the ones in `</a>`, `<br/>` and inside a URL are
// structural. Nothing but whitespace or `/` may follow a tag name, which keeps a
// markdown autolink like <https://example.com> out of this, and the attribute
// part is reluctant so `<br/>` leaves its slash to the closing group.
const TAG_PARTS = /(<\/?[a-z][a-z0-9]*)((?:[\s/][^>]*?)??)(\/?>)/gi
const ATTR_VALUE_OR_SLASH = /"[^"]*"|'[^']*'|=[^\s>]*|\//g

const SAFE_SCHEME = /^(?:https:|mailto:|#|\/)/i
// A bare relative path is the only other shape kept. No colon means no scheme,
// and no ampersand means no character reference we failed to decode can become
// one, which is how `&colon;` got through when this was a denylist.
const SAFE_RELATIVE = /^[^:&]*$/

// Decodes the HTML character references an attacker can use to smuggle a scheme
// past a literal string match (numeric entities, and the named &Tab;/&NewLine;
// references browsers treat as insertable whitespace inside a URL), then strips
// raw control whitespace the same way a browser does before scheme-sniffing.
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
