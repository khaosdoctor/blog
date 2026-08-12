<%*
// Adds the series fields to the frontmatter of the post you are in.
// seriesName only belongs on the first part.
const slug = await tp.system.prompt("Series slug (short, becomes the URL)", "grpc")
const order = await tp.system.prompt("Which part is this?", "1")
const first = order.trim() === "1"
const name = first ? await tp.system.prompt("Series title (shown to readers)") : null
tR = first
  ? `series: ${slug}\nseriesName: "${name}"\nseriesOrder: ${order}`
  : `series: ${slug}\nseriesOrder: ${order}`
-%>
