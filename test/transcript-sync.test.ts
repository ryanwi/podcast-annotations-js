import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { TranscriptSync } from '../src/transcript-sync.js'

function createMockAudio() {
  const listeners = {}
  return {
    currentTime: 0,
    paused: false,
    addEventListener(event, fn) {
      listeners[event] = listeners[event] || []
      listeners[event].push(fn)
    },
    removeEventListener(event, fn) {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(f => f !== fn)
      }
    },
    _emit(event) {
      (listeners[event] || []).forEach(fn => fn())
    },
    _listeners: listeners
  }
}

function createTranscriptDOM() {
  const dom = new JSDOM(`
    <div id="transcript">
      <div data-start-time="0">First segment</div>
      <div data-start-time="10">Second segment</div>
      <div data-start-time="20">Third segment</div>
      <div data-start-time="30">Fourth segment</div>
    </div>
  `)
  return dom.window.document.querySelector('#transcript')
}

describe('TranscriptSync', () => {
  let audio

  beforeEach(() => {
    audio = createMockAudio()
  })

  it('highlights the active segment', () => {
    const container = createTranscriptDOM()
    new TranscriptSync(audio, { container, autoScroll: false })

    audio.currentTime = 15
    audio._emit('timeupdate')

    const segments = container.querySelectorAll('[data-start-time]')
    expect(segments[0].classList.contains('past')).toBe(true)
    expect(segments[1].classList.contains('active')).toBe(true)
    expect(segments[2].classList.contains('future')).toBe(true)
    expect(segments[3].classList.contains('future')).toBe(true)
  })

  it('fires onSegmentChange callback', () => {
    const container = createTranscriptDOM()
    const onChange = vi.fn()
    new TranscriptSync(audio, { container, autoScroll: false, onSegmentChange: onChange })

    audio.currentTime = 25
    audio._emit('timeupdate')

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ textContent: 'Third segment' }),
      2
    )
  })

  it('does not fire callback when segment unchanged', () => {
    const container = createTranscriptDOM()
    const onChange = vi.fn()
    new TranscriptSync(audio, { container, autoScroll: false, onSegmentChange: onChange })

    audio.currentTime = 15
    audio._emit('timeupdate')
    audio._emit('timeupdate') // same time

    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('supports custom class names', () => {
    const container = createTranscriptDOM()
    new TranscriptSync(audio, {
      container,
      autoScroll: false,
      activeClass: 'is-active',
      pastClass: 'is-past',
      futureClass: 'is-future'
    })

    audio.currentTime = 15
    audio._emit('timeupdate')

    const segments = container.querySelectorAll('[data-start-time]')
    expect(segments[1].classList.contains('is-active')).toBe(true)
    expect(segments[0].classList.contains('is-past')).toBe(true)
    expect(segments[2].classList.contains('is-future')).toBe(true)
  })

  it('cleans up on destroy', () => {
    const container = createTranscriptDOM()
    const sync = new TranscriptSync(audio, { container, autoScroll: false })

    sync.destroy()
    expect(audio._listeners.timeupdate).toHaveLength(0)
  })

  it('supports refresh() for dynamic transcripts', () => {
    const container = createTranscriptDOM()
    const sync = new TranscriptSync(audio, { container, autoScroll: false })

    // Add a new segment dynamically
    const newSegment = container.ownerDocument.createElement('div')
    newSegment.setAttribute('data-start-time', '40')
    newSegment.textContent = 'Fifth segment'
    container.appendChild(newSegment)

    sync.refresh()

    audio.currentTime = 42
    audio._emit('timeupdate')

    expect(newSegment.classList.contains('active')).toBe(true)
  })

  it('exposes isAutoScrolling', () => {
    const container = createTranscriptDOM()
    const sync = new TranscriptSync(audio, { container, autoScroll: true })

    expect(sync.isAutoScrolling).toBe(true)
  })

  it('clears all classes when seeking backward past all segments', () => {
    const container = createTranscriptDOM()
    new TranscriptSync(audio, { container, autoScroll: false })

    // First, seek to activate segment 0
    audio.currentTime = 5
    audio._emit('timeupdate')

    const segments = container.querySelectorAll('[data-start-time]')
    expect(segments[0].classList.contains('active')).toBe(true)

    // Now seek backward before all segments
    audio.currentTime = -1
    audio._emit('timeupdate')

    // All classes should be cleared — no segment is active, past, or future
    for (const seg of segments) {
      expect(seg.classList.contains('active')).toBe(false)
      expect(seg.classList.contains('past')).toBe(false)
      expect(seg.classList.contains('future')).toBe(false)
    }
  })
})
