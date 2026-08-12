<%*
const kind = await tp.system.suggester(
  ["Note", "Tip", "Warning", "Caution", "Important"],
  ["NOTE", "TIP", "WARNING", "CAUTION", "IMPORTANT"],
  false,
  "Callout type",
)
const body = await tp.system.prompt("Text", "")
tR = `> [!${kind}]\n> ${body}`
-%>
