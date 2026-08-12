<%*
// Language must be one the highlighter bundles. Dockerfile, output and ssh are
// not, so they are mapped to ones that are.
const lang = await tp.system.prompt("Language", "ts")
const safe = { Dockerfile: "dockerfile", output: "text", ssh: "bash", fortran: "text" }[lang] ?? lang
const title = await tp.system.prompt("File name shown above the block (optional)", "")
const open = title ? `\`\`\`${safe} title="${title}"` : `\`\`\`${safe}`
tR = `${open}\n\n\`\`\``
-%>
