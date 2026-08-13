// rehype-callouts exports its themes as bare stylesheets with no declaration
// file, so a side-effect import of one is a type error even though Vite resolves
// it fine. This says "it is a stylesheet, there is nothing to type".
declare module 'rehype-callouts/theme/*'
