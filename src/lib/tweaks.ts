// The dials, JavaScript half; src/styles/tweaks.css is the CSS half. This file
// must not import anything, so it stays safe in any browser bundle.

// The cards that open when a reader hovers an internal link or a footnote.
export const hoverPreviewCacheEntryLimit = 40
export const hoverPreviewPinnedCardLimit = 6
export const hoverPreviewOpenDelayMilliseconds = 200
export const hoverPreviewCloseDelayMilliseconds = 150
export const hoverPreviewLongPressMilliseconds = 500
export const hoverPreviewDragThresholdPixels = 6
export const hoverPreviewFootnoteCharacterLimit = 480
export const hoverPreviewViewportMarginPixels = 8

// The cellular-automaton field drawn behind every page, and the settings
// panel's four sliders that drive it. Bounds must match SettingsPanel.astro.
export const conwayCellSizePixels = 12
export const conwayDefaultDensityPercent = 10
export const conwayMinimumDensityPercent = 1
export const conwayMaximumDensityPercent = 20
export const conwayDefaultGenerationsPerSecond = 6
export const conwayMinimumGenerationsPerSecond = 1
export const conwayMaximumGenerationsPerSecond = 25
export const conwayDefaultAutoFeedSeconds = 3
export const conwayMinimumAutoFeedSeconds = 0
export const conwayMaximumAutoFeedSeconds = 20
export const conwayDefaultOpacity = 0.04
export const conwayMinimumOpacity = 0
export const conwayMaximumOpacity = 0.5

// The settings panel's text-size stepper, which scales a post's body copy.
export const fontSizeMinimumPercent = 50
export const fontSizeMaximumPercent = 160
export const fontSizeStepPercent = 10
export const fontSizeDefaultPercent = 100

// The header wordmark: its block cursor's blink, and the occasional glitch
// burst that hits the wordmark and the mark together.
export const cursorBlinkPhaseMilliseconds = 530
export const cursorRampMilliseconds = 90
export const cursorRampFrameCount = 2
export const glitchMinimumIntervalMilliseconds = 4000
export const glitchMaximumIntervalMilliseconds = 20000
export const glitchPulseMinimumMilliseconds = 80
export const glitchPulseMaximumMilliseconds = 150
export const glitchPulseGapMinimumMilliseconds = 60
export const glitchPulseGapMaximumMilliseconds = 160

// The header's search palette, and the standalone /search/ page's own limit.
export const searchShortcutDefaultLetter = 'K'
export const searchPaletteResultLimit = 5
export const searchPaletteDebounceMilliseconds = 200
export const searchPageResultLimit = 20
