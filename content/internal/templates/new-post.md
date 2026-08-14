<%*
// Creates a post: asks for the slug, then moves the note to
// blog/<slug>/index so the file and its images live together.
//
// Images: paste a screenshot and it lands next to the post as ./image.png,
// because attachmentFolderPath is "./".
//
// Categories: javascript, typescript, infra, security, career, opinion, meta.
// A new value creates a new section page, and content/categories.json is where
// a section gets its description.
//
// Optional frontmatter: updatedDate, heroImage, heroImageAlt, seoTitle,
// seoDescription, noindex, slug, authors.
//
// authors is a list in git's format, ["Name <https://site>"]. Leave it out and
// the post is yours.
//
// Series: `series` is a short slug (grpc) and becomes the URL, `seriesOrder` is
// the position, and `seriesName` goes on the first part only. The table of
// contents is generated from those.
//
// Publishing: set draft to false and push. A pubDate in the future means
// scheduled, and it goes live on its own at that minute.

const title = await tp.system.prompt("Title")
const suggested = title
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
const slug = await tp.system.prompt("Slug (this is the URL)", suggested)
await tp.file.move(`blog/${slug}/index`)
-%>
---
title: "<% title %>"
pubDate: <% tp.date.now("YYYY-MM-DD") %>
lang: pt
category: typescript
tags: []
description: ""
draft: true
---

