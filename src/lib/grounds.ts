/**
 * The two page grounds, for everything that cannot read a custom property: the
 * theme-color meta tags, the web manifest, the cover raster and the generated
 * icons. Mirrored by hand from `--dial-page-light` and `--dial-page-dark` in
 * src/styles/tweaks.css, which stays the source for anything CSS can reach.
 *
 * A leaf module: importing nothing is what lets the node scripts use it.
 */
export const LIGHT_GROUND = '#f4efe0'
export const DARK_GROUND = '#000000'
