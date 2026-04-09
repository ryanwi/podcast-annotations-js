import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { parseChaptersJSON, ChapterSync } from '../src/chapters.js'

function createMockAudio() {
  const listeners: Record<string, Function[]> = {}
  return {
    currentTime: 0,
    paused: false,
    play: vi.fn(),
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
    },
    _listeners: listeners
  } as unknown as HTMLAudioElement & { _emit: (e: string) => void }
}

const SAMPLE_JSON = {
  version: '1.2.0',
  chapters: [
    { startTime: 0, title: 'Intro' },
    { startTime: 60, title: 'Main Topic', img: 'https://example.com/img.jpg' },
    { startTime: 180, title: 'Q&A', url: 'https://example.com' },
    { startTime: 300, title: 'Wrap Up' }
  ]
}

describe('parseChaptersJSON', () => {
  it('parses a chapters object', () => {
    const chapters = parseChaptersJSON(SAMPLE_JSON)
    expect(chapters).toHaveLength(4)
    expect(chapters[0].title).toBe('Intro')
    expect(chapters[1].img).toBe('https://example.com/img.jpg')
  })

  it('parses a JSON string', () => {
    const chapters = parseChaptersJSON(JSON.stringify(SAMPLE_JSON))
    expect(chapters).toHaveLength(4)
  })

  it('sorts by startTime', () => {
    const chapters = parseChaptersJSON({
      version: '1.2.0',
      chapters: [
        { startTime: 100, title: 'Second' },
        { startTime: 0, title: 'First' }
      ]
    })
    expect(chapters[0].title).toBe('First')
    expect(chapters[1].title).toBe('Second')
  })

  it('filters out invalid chapters', () => {
    const chapters = parseChaptersJSON({
      version: '1.2.0',
      chapters: [
        { startTime: 0, title: 'Valid' },
        { startTime: 10, title: '' },
        { startTime: undefined as unknown as number, title: 'No time' }
      ]
    })
    expect(chapters).toHaveLength(1)
  })
})

describe('ChapterSync', () => {
  let audio: HTMLAudioElement & { _emit: (e: string) => void }

  beforeEach(() => {
    audio = createMockAudio()
  })

  it('renders chapters into container', () => {
    const dom = new JSDOM('<div id="chapters"></div>')
    const container = dom.window.document.querySelector('#chapters') as HTMLElement

    new ChapterSync(audio, SAMPLE_JSON.chapters, { container })

    const items = container.querySelectorAll('.pa-chapter')
    expect(items).toHaveLength(4)
    expect(items[0].querySelector('.pa-chapter-title')!.textContent).toBe('Intro')
    expect(items[1].querySelector('.pa-chapter-img')).not.toBeNull()
  })

  it('highlights active chapter on timeupdate', () => {
    const dom = new JSDOM('<div id="chapters"></div>')
    const container = dom.window.document.querySelector('#chapters') as HTMLElement

    new ChapterSync(audio, SAMPLE_JSON.chapters, { container })

    audio.currentTime = 90
    audio._emit('timeupdate')

    const items = container.querySelectorAll('.pa-chapter')
    expect(items[0].classList.contains('active')).toBe(false)
    expect(items[1].classList.contains('active')).toBe(true)
  })

  it('fires onChapterChange callback', () => {
    const onChange = vi.fn()
    new ChapterSync(audio, SAMPLE_JSON.chapters, { onChapterChange: onChange })

    audio.currentTime = 200
    audio._emit('timeupdate')

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Q&A' }),
      2
    )
  })

  it('fires null when moving back before all chapters', () => {
    const onChange = vi.fn()
    new ChapterSync(audio, [{ startTime: 10, title: 'Late start' }], { onChapterChange: onChange })

    // First enter a chapter
    audio.currentTime = 15
    audio._emit('timeupdate')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ title: 'Late start' }), 0)

    // Then move before it
    audio.currentTime = 5
    audio._emit('timeupdate')
    expect(onChange).toHaveBeenLastCalledWith(null, -1)
  })

  it('does not call play on click by default', () => {
    const onSeek = vi.fn()
    const sync = new ChapterSync(audio, SAMPLE_JSON.chapters, { onSeek })
    audio.paused = true

    // Simulate what _handleClick does
    sync['_handleClick']({ currentTarget: { dataset: { startTime: '60' } } } as unknown as Event)

    expect(onSeek).toHaveBeenCalledWith(60)
    expect((audio as any).play).not.toHaveBeenCalled()
  })

  it('calls play on click when autoplay is true', () => {
    const onSeek = vi.fn()
    const sync = new ChapterSync(audio, SAMPLE_JSON.chapters, { onSeek, autoplay: true })
    audio.paused = true

    sync['_handleClick']({ currentTarget: { dataset: { startTime: '60' } } } as unknown as Event)

    expect(onSeek).toHaveBeenCalledWith(60)
    expect((audio as any).play).toHaveBeenCalled()
  })

  it('exposes currentChapter getter', () => {
    const sync = new ChapterSync(audio, SAMPLE_JSON.chapters)

    audio.currentTime = 150
    audio._emit('timeupdate')

    expect(sync.currentChapter?.title).toBe('Main Topic')
  })

  it('creates from JSON string via static factory', () => {
    const sync = ChapterSync.fromJSON(audio, JSON.stringify(SAMPLE_JSON))
    expect(sync.chapters).toHaveLength(4)
  })

  it('cleans up on destroy', () => {
    const dom = new JSDOM('<div id="chapters"></div>')
    const container = dom.window.document.querySelector('#chapters') as HTMLElement

    const sync = new ChapterSync(audio, SAMPLE_JSON.chapters, { container })
    sync.destroy()

    expect(container.innerHTML).toBe('')
  })
})
