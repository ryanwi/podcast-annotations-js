import type { VTTCue, AlignmentMapping, AlignmentRange, AlignmentGap } from './types.js'

/** A segment in the aligned transcript — either content or a gap. */
export type AlignedSegment =
  | { type: 'content'; cue: VTTCue; variantStart: number; variantEnd: number }
  | { type: 'gap'; gap: AlignmentGap }

/**
 * Takes a canonical transcript (VTT cues) and a DAI alignment mapping,
 * produces a timeline of segments with remapped timestamps for the variant audio.
 *
 * Gaps are inserted where the variant has content that doesn't map to the canonical
 * transcript (e.g. dynamically inserted ads).
 *
 * @example
 * const aligned = new AlignedTranscript(canonicalCues, alignmentMapping)
 * const segments = aligned.segments // interleaved content + gaps
 * const cuesOnly = aligned.remappedCues // just the VTTCues with variant times
 */
export class AlignedTranscript {
  readonly segments: AlignedSegment[]
  readonly confidence: number
  readonly gaps: AlignmentGap[]

  constructor(
    readonly canonicalCues: VTTCue[],
    readonly mapping: AlignmentMapping
  ) {
    this.confidence = mapping.confidence
    this.gaps = mapping.gaps
    this.segments = this._build()
  }

  private _build(): AlignedSegment[] {
    const result: AlignedSegment[] = []
    const sortedRanges = [...this.mapping.ranges].sort((a, b) => a.variantStart - b.variantStart)
    const sortedGaps = [...this.mapping.gaps].sort((a, b) => a.variantStart - b.variantStart)

    // Merge gaps and remapped cues into a single timeline sorted by variant time
    let gapIdx = 0

    for (const range of sortedRanges) {
      // Insert any gaps that come before this range
      while (gapIdx < sortedGaps.length && sortedGaps[gapIdx].variantStart < range.variantStart) {
        result.push({ type: 'gap', gap: sortedGaps[gapIdx] })
        gapIdx++
      }

      // Find canonical cues that fall within this range
      const offset = range.variantStart - range.canonicalStart

      for (const cue of this.canonicalCues) {
        if (cue.startTime >= range.canonicalStart && cue.startTime < range.canonicalEnd) {
          result.push({
            type: 'content',
            cue,
            variantStart: cue.startTime + offset,
            variantEnd: cue.endTime + offset
          })
        }
      }
    }

    // Append any remaining gaps after the last range
    while (gapIdx < sortedGaps.length) {
      result.push({ type: 'gap', gap: sortedGaps[gapIdx] })
      gapIdx++
    }

    return result
  }

  /**
   * Get just the remapped VTTCues with variant timestamps.
   * Useful for feeding into TranscriptSync without gap awareness.
   */
  get remappedCues(): VTTCue[] {
    return this.segments
      .filter((s): s is Extract<AlignedSegment, { type: 'content' }> => s.type === 'content')
      .map(s => ({
        ...s.cue,
        startTime: s.variantStart,
        endTime: s.variantEnd
      }))
  }

  /**
   * Check if a given variant time falls within a gap.
   */
  isInGap(variantTime: number): AlignmentGap | null {
    return this.gaps.find(g =>
      variantTime >= g.variantStart && variantTime < g.variantEnd
    ) ?? null
  }

  /**
   * Whether alignment confidence is high enough for synced display.
   * Below this threshold, consumers should show canonical transcript
   * with a "timing may be inaccurate" warning.
   */
  get isSyncReliable(): boolean {
    return this.confidence >= 0.7
  }
}
