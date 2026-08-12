<%*
const file = await tp.system.prompt("Image file name (in this post's folder)", "image.png")
const alt = await tp.system.prompt("Alt text (leave empty if the caption says it)", "")
const caption = await tp.system.prompt("Caption (optional)", "")
tR = caption ? `![${alt}](./${file} "${caption}")` : `![${alt}](./${file})`
-%>
