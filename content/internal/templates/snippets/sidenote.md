<%*
// Inline content only. A heading or a list inside one of these breaks the page,
// because it renders inside a <span>.
const numbered = await tp.system.suggester(
  ["Sidenote (numbered)", "MarginNote (no number)"],
  ["Sidenote", "MarginNote"],
  false,
  "Which kind",
)
const text = await tp.system.prompt("Note text")
tR = `<${numbered}>${text}</${numbered}>`
-%>
