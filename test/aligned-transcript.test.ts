import { describe, it, expect } from 'vitest'
import { AlignedTranscript } from '../src/aligned-transcript.js'
import type { VTTCue, AlignmentMapping } from '../src/types.js'

const canonicalCues: VTTCue[] = [
  { startTime: 0, endTime: 5, text: 'Welcome to the show.', speaker: 'Host' },
  { startTime: 5, endTime: 15, text: 'Today we talk about engines.', speaker: 'Host' },
  { startTime: 15, endTime: 30, text: 'The LS engine is legendary.', speaker: 'Guest' },
  { startTime: 30, endTime: 45, text: 'Let me explain why.', speaker: 'Guest' },
  { startTime: 45, endTime: 60, text: 'Thanks for listening.', speaker: 'Host' }
]

describe('AlignedTranscript', () => {
  it('remaps cues through a simple offset alignment', () => {
    const mapping: AlignmentMapping = {
      confidence: 0.95,
      ranges: [
        { canonicalStart: 0, canonicalEnd: 60, variantStart: 30, variantEnd: 90 }
      ],
      gaps: []
    }

    const aligned = new AlignedTranscript(canonicalCues, mapping)
    const cues = aligned.remappedCues

    expect(cues).toHaveLength(5)
    expect(cues[0].startTime).toBe(30) // 0 + 30 offset
    expect(cues[0].endTime).toBe(35)
    expect(cues[0].text).toBe('Welcome to the show.')
    expect(cues[4].startTime).toBe(75) // 45 + 30
  })

  it('inserts gaps between ranges', () => {
    const mapping: AlignmentMapping = {
      confidence: 0.9,
      ranges: [
        { canonicalStart: 0, canonicalEnd: 15, variantStart: 0, variantEnd: 15 },
        { canonicalStart: 15, canonicalEnd: 60, variantStart: 45, variantEnd: 90 }
      ],
      gaps: [
        { variantStart: 15, variantEnd: 45, label: 'ad' }
      ]
    }

    const aligned = new AlignedTranscript(canonicalCues, mapping)

    expect(aligned.segments[0].type).toBe('content')
    expect(aligned.segments[1].type).toBe('content')

    // Gap should appear between the two ranges
    const gapSegment = aligned.segments.find(s => s.type === 'gap')
    expect(gapSegment).toBeDefined()
    expect(gapSegment!.type === 'gap' && gapSegment!.gap.label).toBe('ad')

    // Content after gap has remapped times
    const postGapContent = aligned.segments.filter(s => s.type === 'content' && s.variantStart >= 45)
    expect(postGapContent.length).toBe(3) // cues at canonical 15, 30, 45
  })

  it('isInGap detects gap positions', () => {
    const mapping: AlignmentMapping = {
      confidence: 0.9,
      ranges: [
        { canonicalStart: 0, canonicalEnd: 15, variantStart: 0, variantEnd: 15 },
        { canonicalStart: 15, canonicalEnd: 60, variantStart: 45, variantEnd: 90 }
      ],
      gaps: [
        { variantStart: 15, variantEnd: 45, label: 'mid-roll' }
      ]
    }

    const aligned = new AlignedTranscript(canonicalCues, mapping)

    expect(aligned.isInGap(10)).toBeNull()
    expect(aligned.isInGap(20)?.label).toBe('mid-roll')
    expect(aligned.isInGap(50)).toBeNull()
  })

  it('reports sync reliability based on confidence', () => {
    const highConf = new AlignedTranscript(canonicalCues, {
      confidence: 0.95, ranges: [], gaps: []
    })
    expect(highConf.isSyncReliable).toBe(true)

    const lowConf = new AlignedTranscript(canonicalCues, {
      confidence: 0.3, ranges: [], gaps: []
    })
    expect(lowConf.isSyncReliable).toBe(false)
  })

  it('handles multiple gaps', () => {
    const mapping: AlignmentMapping = {
      confidence: 0.85,
      ranges: [
        { canonicalStart: 0, canonicalEnd: 15, variantStart: 0, variantEnd: 15 },
        { canonicalStart: 15, canonicalEnd: 30, variantStart: 45, variantEnd: 60 },
        { canonicalStart: 30, canonicalEnd: 60, variantStart: 90, variantEnd: 120 }
      ],
      gaps: [
        { variantStart: 15, variantEnd: 45, label: 'pre-roll' },
        { variantStart: 60, variantEnd: 90, label: 'mid-roll' }
      ]
    }

    const aligned = new AlignedTranscript(canonicalCues, mapping)
    const gapSegments = aligned.segments.filter(s => s.type === 'gap')
    expect(gapSegments).toHaveLength(2)
  })

  it('returns empty remappedCues when no ranges match', () => {
    const aligned = new AlignedTranscript(canonicalCues, {
      confidence: 0.1,
      ranges: [],
      gaps: [{ variantStart: 0, variantEnd: 120 }]
    })

    expect(aligned.remappedCues).toHaveLength(0)
    expect(aligned.isSyncReliable).toBe(false)
  })
})
