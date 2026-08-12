<%*
// The quoted text is the fallback if the embed ever stops loading, so it is
// worth pasting properly.
const url = await tp.system.prompt("Tweet URL")
const text = await tp.system.prompt("Tweet text (the fallback if X breaks)")
const quoted = text.split("\n").map((line) => `> ${line}`).join("\n>\n")
tR = `${quoted}\n>\n> — ![via Twitter](${url})`
-%>
