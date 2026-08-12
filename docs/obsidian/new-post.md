---
title: "<% tp.file.title %>"
pubDate: <% tp.date.now("YYYY-MM-DD") %>
lang: pt
category: typescript
tags: []
description: ""
draft: true
---

<%*
// Templater template for a new post. See docs/architecture.md for how any of
// this renders.
//
// Install: Obsidian > Settings > Templater > Template folder = docs/obsidian,
// then bind "new-post" to a hotkey, or set it as the folder template for
// content/blog.
//
// Save the note as content/blog/<slug>/index.mdx. Images go in that same
// folder, so a pasted screenshot is just ./image.png.
//
// Categories in use: typescript, javascript, infra, security, career,
// newsletter, meta. A new value creates a new section page.
//
// Optional frontmatter: updatedDate, heroImage, epigraph, epigraphCite,
// seoTitle, seoDescription, noindex, canonicalUrl.
//
// For a series, add `series` (a short slug like `grpc`, which becomes the URL),
// `seriesOrder`, and `seriesName` on the first part only. The table of contents
// is generated from those.
//
// Publishing: set draft to false and push. A pubDate in the future means
// scheduled, and it goes live on its own at that minute.
-%>
