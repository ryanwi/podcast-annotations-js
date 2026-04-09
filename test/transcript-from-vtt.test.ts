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
    }
  }
}

const SAMPLE_VTT = `WEBVTT

00:00:05.000 --> 00:00:10.000
<v Alex>Welcome to the show.

00:00:10.500 --> 00:00:15.000
<v Tyler>Thanks for having me.

00:00:15.500 --> 00:00:20.000
Let's talk about cars.
`

describe('TranscriptSync.fromVTT', () => {
  let audio

  beforeEach(() => {
    audio = createMockAudio()
  })

  it('renders cues into the container', () => {
    const dom = new JSDOM('<div id="transcript"></div>')
    const container = dom.window.document.querySelector('#transcript')

    TranscriptSync.fromVTT(audio, SAMPLE_VTT, { container, autoScroll: false })

    const segments = container.querySelectorAll('[data-start-time]')
    expect(segments).toHaveLength(3)
    expect(segments[0].getAttribute('data-start-time')).toBe('5')
    expect(segments[0].getAttribute('data-end-time')).toBe('10')
  })

  it('renders speaker names in default mode', () => {
    const dom = new JSDOM('<div id="transcript"></div>')
    const container = dom.window.document.querySelector('#transcript')

    TranscriptSync.fromVTT(audio, SAMPLE_VTT, { container, autoScroll: false })

    const speakers = container.querySelectorAll('.pa-transcript-speaker')
    expect(speakers).toHaveLength(2)
    expect(speakers[0].textContent).toBe('Alex')
    expect(speakers[1].textContent).toBe('Tyler')
  })

  it('highlights segments during playback', () => {
    const dom = new JSDOM('<div id="transcript"></div>')
    const container = dom.window.document.querySelector('#transcript')

    TranscriptSync.fromVTT(audio, SAMPLE_VTT, { container, autoScroll: false })

    audio.currentTime = 12
    audio._emit('timeupdate')

    const segments = container.querySelectorAll('[data-start-time]')
    expect(segments[0].classList.contains('past')).toBe(true)
    expect(segments[1].classList.contains('active')).toBe(true)
    expect(segments[2].classList.contains('future')).toBe(true)
  })

  it('supports custom renderSegment', () => {
    const dom = new JSDOM('<div id="transcript"></div>')
    const container = dom.window.document.querySelector('#transcript')

    TranscriptSync.fromVTT(audio, SAMPLE_VTT, {
      container,
      autoScroll: false,
      renderSegment(cue, el) {
        el.innerHTML = `<em>${cue.speaker || 'Unknown'}:</em> ${cue.text}`
      }
    })

    const segments = container.querySelectorAll('[data-start-time]')
    expect(segments[0].innerHTML).toBe('<em>Alex:</em> Welcome to the show.')
  })
})
