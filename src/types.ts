/** Base annotation shape accepted by all modules. */
export interface Annotation {
  id?: string | number
  startTime: number
  endTime: number
  data?: Record<string, unknown>
}

/** Annotation enriched with computed trigger/display windows. */
export interface EnrichedAnnotation extends Annotation {
  id: string | number
  triggerStartTime: number
  displayEndTime: number
}

/** Timing configuration for annotation display windows. */
export interface TimingOptions {
  /** Seconds before startTime to trigger display. @default 2 */
  leadTime?: number
  /** Minimum gap between consecutive annotations. @default 5 */
  transitionBuffer?: number
  /** Maximum seconds to extend display past endTime. @default 60 */
  maxExtension?: number
}

/** A parsed VTT/SRT cue. */
export interface VTTCue {
  startTime: number
  endTime: number
  text: string
  speaker: string | null
}

/** A podcast chapter (Podcasting 2.0 JSON format). */
export interface Chapter {
  startTime: number
  title: string
  img?: string
  url?: string
  toc?: boolean
}

/** Podcasting 2.0 chapters JSON file structure. */
export interface ChaptersJSON {
  version: string
  chapters: Chapter[]
}

/** A matched range in a DAI alignment mapping. */
export interface AlignmentRange {
  /** Start time in the canonical transcript. */
  canonicalStart: number
  /** End time in the canonical transcript. */
  canonicalEnd: number
  /** Start time in the variant (downloaded) audio. */
  variantStart: number
  /** End time in the variant (downloaded) audio. */
  variantEnd: number
}

/** A gap in the alignment where no canonical content maps. */
export interface AlignmentGap {
  /** Start time in the variant audio where the gap begins. */
  variantStart: number
  /** End time in the variant audio where the gap ends. */
  variantEnd: number
  /** Optional label (e.g. "ad", "transition", "unknown"). */
  label?: string
  /** Position in episode: "pre-roll", "mid-roll", or "post-roll". */
  position?: string
}

/** Full alignment mapping between canonical transcript and a variant audio file. */
export interface AlignmentMapping {
  /** Hash of the variant audio file. */
  variantHash?: string
  /** Confidence score 0-1. */
  confidence: number
  /** Matched content ranges. */
  ranges: AlignmentRange[]
  /** Unmapped gap ranges (ads, promos, etc). */
  gaps: AlignmentGap[]
}
