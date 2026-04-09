export { AnnotationOverlay } from './annotation-overlay.js'
export type { AnnotationOverlayOptions } from './annotation-overlay.js'

export { TranscriptSync } from './transcript-sync.js'
export type { TranscriptSyncOptions } from './transcript-sync.js'

export { AnnotationTimeline } from './annotation-timeline.js'
export type { AnnotationTimelineOptions } from './annotation-timeline.js'

export { ChapterSync, parseChaptersJSON, fetchChapters } from './chapters.js'
export type { ChapterSyncOptions } from './chapters.js'

export { enrichAnnotationsWithTiming, selectCurrentAnnotation, upcomingAnnotations } from './timing.js'
export { parseVTT, fetchVTT } from './vtt-parser.js'
export { formatTime } from './utils.js'

export type { Annotation, EnrichedAnnotation, TimingOptions, VTTCue, Chapter, ChaptersJSON } from './types.js'
