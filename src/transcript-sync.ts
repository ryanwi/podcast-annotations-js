import { parseVTT, fetchVTT } from './vtt-parser.js'
import type { VTTCue } from './types.js'

export interface TranscriptSyncOptions {
  container?: HTMLElement
  segmentSelector?: string
  startTimeAttribute?: string
  activeClass?: string
  pastClass?: string
  futureClass?: string
  autoScroll?: boolean
  scrollBehavior?: ScrollBehavior
  scrollBlock?: ScrollLogicalPosition
  onSegmentChange?: (element: Element, index: number) => void
  onAutoScrollPause?: () => void
  onAutoScrollResume?: () => void
  renderSegment?: (cue: VTTCue, element: HTMLElement) => void
}

export class TranscriptSync {
  audio: HTMLAudioElement
  container?: HTMLElement
  autoScrollEnabled: boolean
  activeSegmentIndex: number = -1

  private options: Required<Pick<TranscriptSyncOptions,
    'segmentSelector' | 'startTimeAttribute' | 'activeClass' | 'pastClass' | 'futureClass' |
    'autoScroll' | 'scrollBehavior' | 'scrollBlock'
  >> & TranscriptSyncOptions

  private _segments: Element[] = []
  private _startTimes: number[] = []
  private _programmaticScroll = false
  private _scrollResetTimeout: ReturnType<typeof setTimeout> | null = null
  private _boundUpdate: () => void
  private _boundScroll: () => void

  constructor(audio: HTMLAudioElement, options: TranscriptSyncOptions = {}) {
    this.audio = audio
    this.options = {
      segmentSelector: '[data-start-time]',
      startTimeAttribute: 'data-start-time',
      activeClass: 'active',
      pastClass: 'past',
      futureClass: 'future',
      autoScroll: true,
      scrollBehavior: 'smooth',
      scrollBlock: 'center',
      ...options
    }

    this.container = options.container
    this.autoScrollEnabled = this.options.autoScroll

    this._cacheSegments()

    this._boundUpdate = this._update.bind(this)
    this._boundScroll = this._handleUserScroll.bind(this)

    this.audio.addEventListener('timeupdate', this._boundUpdate)

    if (this.container) {
      this.container.addEventListener('scroll', this._boundScroll, { passive: true })
    }
  }

  private _cacheSegments(): void {
    if (!this.container) return
    this._segments = Array.from(this.container.querySelectorAll(this.options.segmentSelector))
    this._startTimes = this._segments.map(el =>
      parseFloat(el.getAttribute(this.options.startTimeAttribute) ?? '0')
    )
  }

  private _update(): void {
    const time = this.audio.currentTime
    let activeIndex = -1

    let lo = 0
    let hi = this._startTimes.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      if (this._startTimes[mid] <= time) {
        activeIndex = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }

    if (activeIndex === this.activeSegmentIndex) return

    const prevIndex = this.activeSegmentIndex
    this.activeSegmentIndex = activeIndex

    this._updateSegmentClasses(prevIndex, activeIndex)

    if (this.options.onSegmentChange && activeIndex >= 0) {
      this.options.onSegmentChange(this._segments[activeIndex], activeIndex)
    }

    if (activeIndex >= 0 && this.autoScrollEnabled && !this.audio.paused) {
      this._scrollToSegment(this._segments[activeIndex])
    }
  }

  private _updateSegmentClasses(prevIndex: number, newIndex: number): void {
    const { activeClass, pastClass, futureClass } = this.options

    if (prevIndex === -1 && newIndex >= 0) {
      this._segments.forEach((el, i) => {
        el.classList.toggle(activeClass, i === newIndex)
        el.classList.toggle(pastClass, i < newIndex)
        el.classList.toggle(futureClass, i > newIndex)
      })
      return
    }

    if (prevIndex >= 0 && this._segments[prevIndex]) {
      this._segments[prevIndex].classList.remove(activeClass)
    }

    if (newIndex >= 0 && this._segments[newIndex]) {
      this._segments[newIndex].classList.add(activeClass)
      this._segments[newIndex].classList.remove(pastClass)
      this._segments[newIndex].classList.remove(futureClass)
    }

    const lo = Math.min(prevIndex, newIndex)
    const hi = Math.max(prevIndex, newIndex)
    for (let i = lo; i <= hi; i++) {
      if (i === newIndex || i < 0 || !this._segments[i]) continue
      this._segments[i].classList.remove(activeClass)
      this._segments[i].classList.toggle(pastClass, i < newIndex)
      this._segments[i].classList.toggle(futureClass, i > newIndex)
    }
  }

  private _scrollToSegment(segment: Element): void {
    if (!segment) return

    this._programmaticScroll = true
    segment.scrollIntoView({
      behavior: this.options.scrollBehavior,
      block: this.options.scrollBlock
    })

    if (this._scrollResetTimeout) clearTimeout(this._scrollResetTimeout)
    this._scrollResetTimeout = setTimeout(() => {
      this._programmaticScroll = false
    }, 1000)
  }

  private _handleUserScroll(): void {
    if (this._programmaticScroll) return
    if (this.audio.paused) return
    if (!this.autoScrollEnabled) return

    this.autoScrollEnabled = false
    this.options.onAutoScrollPause?.()
  }

  resumeAutoScroll(): void {
    this.autoScrollEnabled = true
    this.options.onAutoScrollResume?.()

    if (this.activeSegmentIndex >= 0 && this._segments[this.activeSegmentIndex]) {
      this._scrollToSegment(this._segments[this.activeSegmentIndex])
    }
  }

  refresh(): void {
    this._cacheSegments()
    this.activeSegmentIndex = -1
    this._update()
  }

  get isAutoScrolling(): boolean {
    return this.autoScrollEnabled
  }

  destroy(): void {
    this.audio.removeEventListener('timeupdate', this._boundUpdate)
    if (this.container) {
      this.container.removeEventListener('scroll', this._boundScroll)
    }
    if (this._scrollResetTimeout) clearTimeout(this._scrollResetTimeout)
    this._segments = []
    this._startTimes = []
  }

  /** Create from a VTT/SRT string. Renders segments into the container. */
  static fromVTT(audio: HTMLAudioElement, vttString: string, options: TranscriptSyncOptions = {}): TranscriptSync {
    const cues = parseVTT(vttString)
    TranscriptSync._renderCues(cues, options)
    return new TranscriptSync(audio, options)
  }

  /** Create by fetching a VTT/SRT file from a URL. */
  static async fromURL(audio: HTMLAudioElement, url: string, options: TranscriptSyncOptions = {}): Promise<TranscriptSync> {
    const cues = await fetchVTT(url)
    TranscriptSync._renderCues(cues, options)
    return new TranscriptSync(audio, options)
  }

  private static _renderCues(cues: VTTCue[], options: TranscriptSyncOptions): void {
    if (!options.container) return

    options.container.innerHTML = ''
    const attr = options.startTimeAttribute ?? 'data-start-time'
    const doc = options.container.ownerDocument ?? document

    cues.forEach(cue => {
      const el = doc.createElement('div')
      el.setAttribute(attr, String(cue.startTime))
      el.setAttribute('data-end-time', String(cue.endTime))

      if (options.renderSegment) {
        options.renderSegment(cue, el)
      } else {
        if (cue.speaker) {
          const speakerEl = doc.createElement('span')
          speakerEl.className = 'pa-transcript-speaker'
          speakerEl.textContent = cue.speaker
          el.appendChild(speakerEl)

          const textEl = doc.createElement('span')
          textEl.className = 'pa-transcript-text'
          textEl.textContent = ' ' + cue.text
          el.appendChild(textEl)
        } else {
          el.textContent = cue.text
        }
      }

      options.container!.appendChild(el)
    })
  }
}
