// rehype-callouts ships its themes as bare stylesheets with no declaration file,
// so a side-effect import is a type error even though Vite resolves it fine.
declare module 'rehype-callouts/theme/*'
