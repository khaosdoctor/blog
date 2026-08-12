<%*
// Self-hosted mp4. Lives in public/videos/, not next to the post, because
// astro:assets only handles images.
const slug = tp.file.folder(false)
const name = await tp.system.prompt("File name", "clip.mp4")
const caption = await tp.system.prompt("Caption (optional)", "")
const src = `/videos/${slug}/${name}`
tR = caption
  ? `<Video src="${src}" caption="${caption}" />`
  : `<Video src="${src}" />`
-%>
