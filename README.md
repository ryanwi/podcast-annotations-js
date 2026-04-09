# podcast-annotations

Timed annotation overlays, live transcript sync, and annotation timelines for audio players. Framework-agnostic vanilla JavaScript — zero dependencies.

Built for [Car Curious](https://getcarcurious.com), the automotive podcast annotation platform.

## Features

- **Annotation Overlay** — Auto-trigger contextual content at specific moments during audio playback
- **Transcript Sync** — Highlight the active transcript segment with auto-scroll and user-interrupt detection
- **Annotation Timeline** — Visual markers showing where annotations appear, with a playhead and click-to-seek

Each module works independently. Use one, two, or all three.

## Install

```bash
npm install podcast-annotations
```

Or use a CDN:

```html
<script type="module">
  import { AnnotationOverlay, TranscriptSync, AnnotationTimeline } from 'https://esm.sh/podcast-annotations'
</script>
```

## Quick Start

```js
import { AnnotationOverlay, TranscriptSync, AnnotationTimeline } from 'podcast-annotations'

const audio = document.querySelector('audio')

// Annotations auto-trigger during playback
const overlay = new AnnotationOverlay(audio, {
  annotations: [
    { startTime: 45, endTime: 75, data: { title: 'LS Engine', type: 'car' } },
    { startTime: 120, endTime: 150, data: { title: 'Turbocharger', type: 'part' } }
  ],
  onAnnotationChange(annotation) {
    document.querySelector('#overlay').innerHTML = annotation
      ? `<strong>${annotation.data.title}</strong>`
      : ''
  },
  onUpcomingChange(upcoming) {
    document.querySelector('#coming-up').innerHTML = upcoming
      .map(a => `<span>${a.data.title} at ${Math.floor(a.startTime)}s</span>`)
      .join('')
  }
})

// Transcript from a VTT file — renders and syncs automatically
const transcript = await TranscriptSync.fromURL(audio, '/episode.vtt', {
  container: document.querySelector('#transcript'),
  activeClass: 'highlight',
  onAutoScrollPause() {
    document.querySelector('#resume-btn').hidden = false
  }
})

// Or from existing DOM elements (data-start-time attributes)
// const transcript = new TranscriptSync(audio, {
//   container: document.querySelector('#transcript'),
//   segmentSelector: '[data-start-time]'
// })

// Timeline with colored markers
const timeline = new AnnotationTimeline(audio, {
  container: document.querySelector('#timeline'),
  annotations: overlay.annotations,
  typeColors: { car: '#60a5fa', part: '#2dd4bf', term: '#c084fc' },
  onSeek(time) { audio.currentTime = time }
})
```

## API

### `AnnotationOverlay(audio, options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `annotations` | `Array` | `[]` | `[{ startTime, endTime, data }]` |
| `overlayElement` | `HTMLElement` | — | Element to add/remove `activeClass`/`hiddenClass` |
| `activeClass` | `string` | `'active'` | Class when annotation is visible |
| `hiddenClass` | `string` | `'hidden'` | Class when no annotation |
| `onAnnotationChange` | `Function` | — | `(annotation \| null) => void` |
| `onUpcomingChange` | `Function` | — | `(upcoming[]) => void` |
| `upcomingLimit` | `number` | `3` | Max upcoming annotations |
| `leadTime` | `number` | `2` | Seconds before startTime to trigger |
| `transitionBuffer` | `number` | `5` | Gap between consecutive annotations |
| `maxExtension` | `number` | `60` | Max seconds to extend past endTime |

**Methods:** `setAnnotations(annotations)`, `destroy()`
**Getters:** `currentAnnotation`, `upcoming`

### `TranscriptSync(audio, options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | — | Scrollable transcript container |
| `segmentSelector` | `string` | `'[data-start-time]'` | CSS selector for segments |
| `startTimeAttribute` | `string` | `'data-start-time'` | Attribute with time in seconds |
| `activeClass` | `string` | `'active'` | Current segment class |
| `pastClass` | `string` | `'past'` | Past segments class |
| `futureClass` | `string` | `'future'` | Future segments class |
| `autoScroll` | `boolean` | `true` | Auto-scroll to active segment |
| `scrollBehavior` | `string` | `'smooth'` | Scroll behavior |
| `onSegmentChange` | `Function` | — | `(element, index) => void` |
| `onAutoScrollPause` | `Function` | — | Called when user scrolls away |
| `onAutoScrollResume` | `Function` | — | Called when auto-scroll resumes |

**Methods:** `resumeAutoScroll()`, `refresh()`, `destroy()`
**Getters:** `isAutoScrolling`

**Static factories:**
- `TranscriptSync.fromVTT(audio, vttString, options)` — Parse a VTT/SRT string, render segments into container, return a synced instance.
- `TranscriptSync.fromURL(audio, url, options)` — Fetch a VTT/SRT file, render, and return a synced instance (async).
- `options.renderSegment(cue, element)` — Custom renderer for VTT cues. Default renders speaker name + text.

### `AnnotationTimeline(audio, options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | — | Timeline container element |
| `annotations` | `Array` | `[]` | Annotation data |
| `duration` | `number` | — | Total seconds (auto-detected if omitted) |
| `onSeek` | `Function` | — | `(timeInSeconds) => void` |
| `markerClass` | `string` | `'pa-timeline-marker'` | CSS class for markers |
| `playheadClass` | `string` | `'pa-timeline-playhead'` | CSS class for playhead |
| `renderMarker` | `Function` | — | `(annotation, element) => void` |

Markers get `data-type` attributes for CSS-based styling. Style with:
```css
.pa-timeline-marker[data-type="car"] { background: #60a5fa; }
.pa-timeline-marker[data-type="term"] { background: #c084fc; }
```

**Methods:** `setAnnotations(annotations)`, `destroy()`

### Timing utilities

```js
import { enrichAnnotationsWithTiming, selectCurrentAnnotation, upcomingAnnotations } from 'podcast-annotations'
```

Low-level functions if you want full control over the timing logic.

## License

MIT
