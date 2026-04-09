import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnnotationOverlay } from '../src/annotation-overlay.js'

function createMockAudio() {
  const listeners = {}
  return {
    currentTime: 0,
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

describe('AnnotationOverlay', () => {
  let audio

  beforeEach(() => {
    audio = createMockAudio()
  })

  it('fires onAnnotationChange when annotation becomes active', () => {
    const onChange = vi.fn()
    new AnnotationOverlay(audio, {
      annotations: [{ startTime: 10, endTime: 30, data: { title: 'Test' } }],
      onAnnotationChange: onChange
    })

    audio.currentTime = 15
    audio._emit('timeupdate')

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      startTime: 10,
      data: { title: 'Test' }
    }))
  })

  it('fires onAnnotationChange with null when annotation ends', () => {
    const onChange = vi.fn()
    new AnnotationOverlay(audio, {
      annotations: [{ startTime: 10, endTime: 30, data: { title: 'Test' } }],
      onAnnotationChange: onChange,
      maxExtension: 5
    })

    audio.currentTime = 15
    audio._emit('timeupdate')
    audio.currentTime = 100
    audio._emit('timeupdate')

    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('fires onUpcomingChange with upcoming annotations', () => {
    const onUpcoming = vi.fn()
    new AnnotationOverlay(audio, {
      annotations: [
        { startTime: 10, endTime: 30, data: { id: 'a' } },
        { startTime: 50, endTime: 70, data: { id: 'b' } }
      ],
      onUpcomingChange: onUpcoming
    })

    audio.currentTime = 0
    audio._emit('timeupdate')

    expect(onUpcoming).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ data: { id: 'a' } }),
        expect.objectContaining({ data: { id: 'b' } })
      ])
    )
  })

  it('manages overlay element classes', () => {
    const el = { classList: { add: vi.fn(), remove: vi.fn() } }
    new AnnotationOverlay(audio, {
      annotations: [{ startTime: 10, endTime: 30 }],
      overlayElement: el
    })

    audio.currentTime = 15
    audio._emit('timeupdate')

    expect(el.classList.add).toHaveBeenCalledWith('active')
    expect(el.classList.remove).toHaveBeenCalledWith('hidden')
  })

  it('cleans up on destroy', () => {
    const overlay = new AnnotationOverlay(audio, {
      annotations: [{ startTime: 10, endTime: 30 }]
    })

    overlay.destroy()
    expect(audio._listeners.timeupdate).toHaveLength(0)
  })

  it('exposes currentAnnotation getter', () => {
    const overlay = new AnnotationOverlay(audio, {
      annotations: [{ startTime: 10, endTime: 30, data: { id: 'a' } }]
    })

    audio.currentTime = 15
    expect(overlay.currentAnnotation.data.id).toBe('a')

    audio.currentTime = 0
    expect(overlay.currentAnnotation).toBeNull()
  })

  it('supports setAnnotations to replace data', () => {
    const onChange = vi.fn()
    const overlay = new AnnotationOverlay(audio, {
      annotations: [{ startTime: 10, endTime: 30, data: { id: 'a' } }],
      onAnnotationChange: onChange
    })

    overlay.setAnnotations([{ startTime: 50, endTime: 70, data: { id: 'b' } }])
    audio.currentTime = 55
    audio._emit('timeupdate')

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ data: { id: 'b' } }))
  })

  it('distinguishes annotations with same time window but different ids', () => {
    const onChange = vi.fn()
    new AnnotationOverlay(audio, {
      annotations: [
        { id: 'x', startTime: 10, endTime: 30, data: { title: 'First' } },
        { id: 'y', startTime: 10, endTime: 30, data: { title: 'Second' } }
      ],
      onAnnotationChange: onChange
    })

    audio.currentTime = 15
    audio._emit('timeupdate')

    // Should resolve to one of them (the last matching, per findLast)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'y' }))
  })

  it('uses top-level id when provided', () => {
    const overlay = new AnnotationOverlay(audio, {
      annotations: [{ id: 42, startTime: 10, endTime: 30, data: { title: 'Test' } }]
    })

    expect(overlay.annotations[0].id).toBe(42)
  })

  it('auto-assigns ids when none provided', () => {
    const overlay = new AnnotationOverlay(audio, {
      annotations: [
        { startTime: 10, endTime: 30 },
        { startTime: 50, endTime: 70 }
      ]
    })

    expect(overlay.annotations[0].id).toBe('_pa_0')
    expect(overlay.annotations[1].id).toBe('_pa_1')
  })
})
