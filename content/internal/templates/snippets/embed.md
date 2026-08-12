<%*
// YouTube, Vimeo, or any other link. Image syntax so Obsidian previews it.
const url = await tp.system.prompt("URL (YouTube, Vimeo, or any link)")
const known = /youtube\.com|youtu\.be|vimeo\.com/.test(url)
tR = known ? `![](${url})` : url
-%>
