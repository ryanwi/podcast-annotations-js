# Changelog

## Unreleased

### Added
- `episode.description` field — optional plain text episode summary or show notes.
- "Show Notes" entry in spec's "Relationship to Other Standards" section.
- `show-notes` npm keyword.

## 0.5.1 (2026-04-12)

### Added
- `fetchAnnotationSet(url)` — fetch and parse a `.annotations.json` file.
- `AnnotationOverlay.fromURL(audio, url, options)` — static factory that fetches an annotation set and creates a synced overlay. Returns `{ overlay, annotationSet }` so consumers also get episode metadata, speakers, transcripts, and ad breaks.

## 0.5.0 (2026-04-11)

### Added
- **Podcast Annotation Format spec** (`SPEC.md`) — open specification (v1.0.0) for timestamped entity annotations on podcast audio. Defines annotation objects, annotation sets, speakers, transcripts, ad breaks, recommended entity types, and W3C Web Annotation mapping.
- Spec fields promoted to top-level on `Annotation` interface: `type`, `title`, `url`, `image`, `speaker`, `quote`, `tags`, `priority`, `canonicalId`, `confidence`, `source`. All optional, backwards-compatible — `data` is still accepted.
- New types: `AnnotationSet`, `Speaker`, `Transcript`, `AdBreak`, `Episode`.
- `AnnotationTimeline` reads top-level `type`/`title` first, falls back to `data.type`/`data.title`.

### Changed
- README updated with spec link, visual mental model, and examples using top-level annotation fields.

## 0.4.3 (2026-04-11)

### Fixed
- `TranscriptSync` did not clear segment classes when seeking backward past all segments. The adjacent-move optimization skipped the full reclassify when `newIndex` was -1 due to an off-by-one in the threshold check.

## 0.4.2 (2026-04-10)

### Added
- `position` field on `AlignmentGap` type — `"pre-roll"`, `"mid-roll"`, or `"post-roll"` classification from the alignment pipeline.
- Documentation for `AlignedTranscript`, `TranscriptSync` gap options, and alignment types in README.
- Prior Art section crediting Overcast DAI discussion.

## 0.4.1 (2026-04-10)

### Added
- `ChapterSync.fromURL` test coverage — success, 404 error, and network error cases.

## 0.4.0 (2026-04-09)

### Added
- **Gap-aware `TranscriptSync`** — `gaps` option accepts `AlignmentGap[]` to define unmapped DAI regions. Highlighting pauses inside gaps and resumes at the next matched segment.
  - `onGapEnter(gap)` / `onGapExit()` callbacks
  - `isInGap` getter
  - `setGaps(gaps)` method for runtime updates
- **`AlignedTranscript`** — takes canonical VTT cues + `AlignmentMapping`, produces a timeline of interleaved content and gap segments with remapped variant timestamps.
  - `remappedCues` getter for feeding into `TranscriptSync`
  - `isInGap(variantTime)` to check if a time falls in a gap
  - `isSyncReliable` getter (confidence >= 0.7)
- New types: `AlignmentRange`, `AlignmentGap`, `AlignmentMapping`, `AlignedSegment`

## 0.3.1 (2026-04-09)

### Fixed
- `ChapterSync` rendered wrong timestamps for podcasts over 1 hour (e.g. `63:00` instead of `1:03:00`). Now uses shared `formatTime` utility.
- Seeking backward in `TranscriptSync` left segments with stale CSS classes. Non-adjacent index changes now trigger a full reclassify.
- `upcomingAnnotations` scanned the entire array on every `timeupdate` tick. Replaced with binary search + slice.
- `ChapterSync` active chapter lookup used linear scan. Replaced with binary search.

### Changed
- `enrichAnnotationsWithTiming` now checks `data.id` as a fallback when assigning IDs, matching the previously documented but unreachable behavior.

### Removed
- Dead `_assignIds` method from `AnnotationOverlay` — ID assignment is now fully handled by `enrichAnnotationsWithTiming`.
- Duplicate `_formatTime` from `ChapterSync`.

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
