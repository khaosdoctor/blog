// ponytail: captions come from migrated Ghost content and are trusted-author
// HTML (credit links, the odd <span style>), not user input — so a small
// denylist is enough here, no DOMPurify-class dependency needed. Strips the
// tags/attributes/URI schemes that could execute script; everything else
// (links, spans, formatting) passes through untouched.
const TAGS_WITH_CONTENT = /<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi
const DANGEROUS_TAGS = /<\/?(script|style|iframe|object|embed|link|meta)\b[^>]*>/gi
const EVENT_HANDLER_ATTR = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const UNSAFE_URI_ATTR = /\s+(?:href|src)\s*=\s*(["'])\s*(?:javascript|data):[^"']*\1/gi

export function sanitizeCaption(html: string): string {
  return html
    .replace(TAGS_WITH_CONTENT, '')
    .replace(DANGEROUS_TAGS, '')
    .replace(EVENT_HANDLER_ATTR, '')
    .replace(UNSAFE_URI_ATTR, '')
}
