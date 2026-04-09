import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { TranscriptSync } from '../src/transcript-sync.js'

function createMockAudio() {
  const listeners: Record<string, Function[]> = {}
  return {
    currentTime: 0,
    paused: false,
    addEventListener(event: string, fn: Function) {
      listeners[event] = listeners[event] || []
      listeners[event].push(fn)
    },
    removeEventListener(event: string, fn: Function) {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((f: Function) => f !== fn)
      }
    },
    _emit(event: string) {
      (listeners[event] || []).forEach((fn: Function) => fn())
    }
  } as unknown as HTMLAudioElement & { _emit: (e: string) => void }
}

function createTranscriptDOM() {
  const dom = new JSDOM(`
    <div id="transcript">
      <div data-start-time="0">Intro</div>
      <div data-start-time="10">Before ad</div>
      <div data-start-time="40">After ad</div>
      <div data-start-time="50">Closing</div>
    </div>
  `)
  return dom.window.document.querySelector('#transcript') as HTMLElement
}

describe('TranscriptSync gap awareness', () => {
  let audio: HTMLAudioElement & { _emit: (e: string) => void }

  beforeEach(() => {
    audio = createMockAudio()
  })

  it('pauses highlighting when inside a gap', () => {
    const container = createTranscriptDOM()
    const onSegmentChange = vi.fn()

    new TranscriptSync(audio, {
      container,
      autoScroll: false,
      onSegmentChange,
      gaps: [{ variantStart: 20, variantEnd: 35 }]
    })

    // Move to before gap — should highlight
    audio.currentTime = 12
    audio._emit('timeupdate')
    expect(onSegmentChange).toHaveBeenCalledTimes(1)

    // Move into gap — should NOT update highlighting
    audio.currentTime = 25
    audio._emit('timeupdate')
    expect(onSegmentChange).toHaveBeenCalledTimes(1) // unchanged

    // Move past gap — should resume highlighting
    audio.currentTime = 42
    audio._emit('timeupdate')
    expect(onSegmentChange).toHaveBeenCalledTimes(2)
  })

  it('fires onGapEnter and onGapExit callbacks', () => {
    const container = createTranscriptDOM()
    const onGapEnter = vi.fn()
    const onGapExit = vi.fn()

    new TranscriptSync(audio, {
      container,
      autoScroll: false,
      onGapEnter,
      onGapExit,
      gaps: [{ variantStart: 20, variantEnd: 35, label: 'mid-roll' }]
    })

    // Enter gap
    audio.currentTime = 25
    audio._emit('timeupdate')
    expect(onGapEnter).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'mid-roll' })
    )
    expect(onGapExit).not.toHaveBeenCalled()

    // Stay in gap — should not fire again
    audio.currentTime = 30
    audio._emit('timeupdate')
    expect(onGapEnter).toHaveBeenCalledTimes(1)

    // Exit gap
    audio.currentTime = 42
    audio._emit('timeupdate')
    expect(onGapExit).toHaveBeenCalledTimes(1)
  })

  it('exposes isInGap getter', () => {
    const container = createTranscriptDOM()
    const sync = new TranscriptSync(audio, {
      container,
      autoScroll: false,
      gaps: [{ variantStart: 20, variantEnd: 35 }]
    })

    expect(sync.isInGap).toBe(false)

    audio.currentTime = 25
    audio._emit('timeupdate')
    expect(sync.isInGap).toBe(true)

    audio.currentTime = 42
    audio._emit('timeupdate')
    expect(sync.isInGap).toBe(false)
  })

  it('supports setGaps to update gaps at runtime', () => {
    const container = createTranscriptDOM()
    const onGapEnter = vi.fn()

    const sync = new TranscriptSync(audio, {
      container,
      autoScroll: false,
      onGapEnter
    })

    // No gaps initially
    audio.currentTime = 25
    audio._emit('timeupdate')
    expect(onGapEnter).not.toHaveBeenCalled()

    // Add gaps
    sync.setGaps([{ variantStart: 20, variantEnd: 35 }])

    audio.currentTime = 25
    audio._emit('timeupdate')
    expect(onGapEnter).toHaveBeenCalledTimes(1)
  })

  it('handles multiple gaps', () => {
    const container = createTranscriptDOM()
    const onGapEnter = vi.fn()

    new TranscriptSync(audio, {
      container,
      autoScroll: false,
      onGapEnter,
      gaps: [
        { variantStart: 15, variantEnd: 18, label: 'pre-roll' },
        { variantStart: 25, variantEnd: 35, label: 'mid-roll' }
      ]
    })

    audio.currentTime = 16
    audio._emit('timeupdate')
    expect(onGapEnter).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'pre-roll' })
    )

    audio.currentTime = 20
    audio._emit('timeupdate')

    audio.currentTime = 30
    audio._emit('timeupdate')
    expect(onGapEnter).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'mid-roll' })
    )

    expect(onGapEnter).toHaveBeenCalledTimes(2)
  })
})
