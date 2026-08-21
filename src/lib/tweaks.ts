/*
 * THE DIALS, JavaScript half.
 *
 * Every runtime value someone might reasonably tune, in one module, mirroring
 * what src/styles/tweaks.css does for CSS. Scripts import from here; nothing
 * in this file may import anything, so it stays safe in any browser bundle.
 */

// ---------------------------------------------------------------------------
// Hover preview cards (scripts/hover-previews.ts)
// ---------------------------------------------------------------------------

/** How many fetched link metadata entries the in-page cache keeps. */
export const hoverPreviewCacheEntryLimit = 40
/** How many preview cards may be pinned open at once. */
export const hoverPreviewPinnedCardLimit = 6
/** How long a link is hovered before its card opens, in milliseconds. */
export const hoverPreviewOpenDelayMilliseconds = 200
/** Grace period before an unpinned card closes, in milliseconds. */
export const hoverPreviewCloseDelayMilliseconds = 150
/** Touch long-press needed to pin a card, in milliseconds. */
export const hoverPreviewLongPressMilliseconds = 500
/** Pointer travel before a press becomes a drag, in pixels. */
export const hoverPreviewDragThresholdPixels = 6
/** Characters shown of a footnote before its card truncates. */
export const hoverPreviewFootnoteCharacterLimit = 480

// ---------------------------------------------------------------------------
// Conway background (scripts/conway.ts)
// ---------------------------------------------------------------------------

/** Size of one Conway cell, in pixels. */
export const conwayCellSizePixels = 12
/** Default share of cells seeded alive, as a percentage. */
export const conwayDefaultDensityPercent = 10
/** Density bounds the settings panel clamps to, in percent. */
export const conwayMinimumDensityPercent = 1
export const conwayMaximumDensityPercent = 20
/** Default generations per second. */
export const conwayDefaultGenerationsPerSecond = 6
/** Speed bounds for the generations-per-second slider. */
export const conwayMinimumGenerationsPerSecond = 1
export const conwayMaximumGenerationsPerSecond = 25
/** Default seconds between automatic glider feeds. */
export const conwayDefaultAutoFeedSeconds = 3
/** Auto-feed bounds, in seconds; 0 turns the feed off. */
export const conwayMinimumAutoFeedSeconds = 0
export const conwayMaximumAutoFeedSeconds = 20
/** Default opacity the field draws at. */
export const conwayDefaultOpacity = 0.04
/** Opacity bounds for the settings panel slider. */
export const conwayMinimumOpacity = 0
export const conwayMaximumOpacity = 0.5

// ---------------------------------------------------------------------------
// Reader text-size control (scripts/settings-panel.ts)
// ---------------------------------------------------------------------------

/** Smallest text size the panel offers, as a percentage. */
export const fontSizeMinimumPercent = 50
/** Largest text size the panel offers, as a percentage. */
export const fontSizeMaximumPercent = 160
/** Step the plus/minus buttons move by, in percent. */
export const fontSizeStepPercent = 10
/** The unstored default text size, in percent. */
export const fontSizeDefaultPercent = 100

// ---------------------------------------------------------------------------
// Header wordmark effects (scripts/header-brand.ts)
// ---------------------------------------------------------------------------

/** One cursor blink phase, in milliseconds; the classic terminal rate. */
export const cursorBlinkPhaseMilliseconds = 530
/** How long the cursor's opacity ramp between phases takes, in milliseconds. */
export const cursorRampMilliseconds = 90
/** How many hard opacity steps that ramp is drawn in. */
export const cursorRampFrameCount = 2
/** Shortest and longest wait between glitch bursts, in milliseconds. */
export const glitchMinimumIntervalMilliseconds = 4000
export const glitchMaximumIntervalMilliseconds = 20000
/** How long a single glitch pulse lasts, bounds in milliseconds. */
export const glitchPulseMinimumMilliseconds = 80
export const glitchPulseMaximumMilliseconds = 150
/** Pause between two pulses of one burst, bounds in milliseconds. */
export const glitchPulseGapMinimumMilliseconds = 60
export const glitchPulseGapMaximumMilliseconds = 160

// ---------------------------------------------------------------------------
// Search (scripts/search-palette.ts and Search.astro)
// ---------------------------------------------------------------------------

/** The unstored default palette shortcut letter (Ctrl/Cmd plus this). */
export const searchShortcutDefaultLetter = 'K'
/** Rows the palette shows; each gets a numbered shortcut, the rest is a link. */
export const searchPaletteResultLimit = 5
/** How long the palette waits after a keystroke before searching, in milliseconds. */
export const searchPaletteDebounceMilliseconds = 200
/** Results the /search/ page renders before the "N more" line. */
export const searchPageResultLimit = 20
