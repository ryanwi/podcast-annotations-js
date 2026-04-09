# Changelog

## 0.3.0 (2026-04-09)

### Added
- `AnnotationOverlay.queryAtTime(time)` — query annotation state at an arbitrary time, independent of `audio.currentTime`. Useful for postMessage-based sync with external players.

## 0.2.0 (2026-04-09)

### Added
- **TypeScript** — full rewrite with exported types for all options and data shapes.
- **`ChapterSync`** — Podcasting 2.0 JSON chapters parser and sync. `ChapterSync.fromJSON()` and `ChapterSync.fromURL()` static factories. Active chapter highlighting, click-to-seek, `onChapterChange` callback, `renderChapter` hook.
- **VTT/SRT parsing** — `parseVTT()` and `fetchVTT()` for lightweight WebVTT and SRT file parsing. Extracts timestamps, text, and speaker names from VTT voice tags.
- **`TranscriptSync.fromVTT()`** and **`TranscriptSync.fromURL()`** — static factories that parse VTT/SRT content and render synced transcript segments automatically.
- **`TranscriptSync.refresh()`** — re-cache segments from DOM and immediately re-evaluate active segment. For dynamic transcripts.
- **Build step** — tsup outputs `dist/index.js` (ESM) + `dist/index.d.ts` (type declarations).
- Exported types: `Annotation`, `EnrichedAnnotation`, `TimingOptions`, `VTTCue`, `Chapter`, `ChaptersJSON`.

### Changed
- `AnnotationTimeline` no longer renders inline styles on markers. Markers get `data-type` attributes and CSS classes — style with `.pa-timeline-marker[data-type="car"]` selectors.
- `TranscriptSync` caches segments on init and uses binary search instead of linear scan. Only toggles CSS classes on changed segments (prev + next) instead of all N segments.
- `AnnotationOverlay` uses explicit `id` field for change detection instead of `startTime:endTime`. Falls back to auto-assigned `_pa_0`, `_pa_1`, etc.
- `TranscriptSync.fromVTT()`/`fromURL()` clear the container before rendering to prevent duplicate nodes on repeated calls.
- `ChapterSync` click-to-seek no longer forces autoplay. Opt-in via `autoplay: true` (defaults to `false`).

### Removed
- `typeColors`, `defaultColor`, `playheadColor` options from `AnnotationTimeline` (use CSS instead).
- `playheadClass` from `ChapterSyncOptions` (was never used).

## 0.1.0 (2026-04-08)

### Added
- Initial release with three framework-agnostic vanilla JS modules:
  - **`AnnotationOverlay`** — auto-trigger contextual content at specific moments during audio playback.
  - **`TranscriptSync`** — highlight active transcript segments with auto-scroll and user-interrupt detection.
  - **`AnnotationTimeline`** — visual annotation markers with playhead and click-to-seek.
- Core timing utilities: `enrichAnnotationsWithTiming()`, `selectCurrentAnnotation()`, `upcomingAnnotations()`.
- `formatTime()` helper.
- Zero dependencies.
