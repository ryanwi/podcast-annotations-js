import { parseVTT, fetchVTT } from './vtt-parser.js'

/**
 * Live transcript synchronization with audio playback.
 *
 * Highlights the active transcript segment, manages auto-scroll,
 * and detects when the user manually scrolls away.
 *
 * @example
 * const sync = new TranscriptSync(audioElement, {
 *   container: document.querySelector('#transcript'),
 *   segmentSelector: '[data-start-time]',
 *   onSegmentChange: (segment, index) => console.log('Active:', segment)
 * })
 */
export class TranscriptSync {
  /**
   * @param {HTMLAudioElement} audio - The audio element to sync with
   * @param {Object} options
   * @param {HTMLElement} options.container - Scrollable container holding transcript segments
   * @param {string} [options.segmentSelector='[data-start-time]'] - CSS selector for segment elements
   * @param {string} [options.startTimeAttribute='data-start-time'] - Attribute holding start time in seconds
   * @param {string} [options.activeClass='active'] - Class for the current segment
   * @param {string} [options.pastClass='past'] - Class for segments before current
   * @param {string} [options.futureClass='future'] - Class for segments after current
   * @param {boolean} [options.autoScroll=true] - Enable auto-scrolling to active segment
   * @param {string} [options.scrollBehavior='smooth'] - ScrollIntoView behavior
   * @param {string} [options.scrollBlock='center'] - ScrollIntoView block alignment
   * @param {Function} [options.onSegmentChange] - Called with (element, index) when active segment changes
   * @param {Function} [options.onAutoScrollPause] - Called when user manually scrolls away
   * @param {Function} [options.onAutoScrollResume] - Called when auto-scroll is re-enabled
   */
  constructor(audio, options = {}) {
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
    this.activeSegmentIndex = -1
    this._programmaticScroll = false
    this._scrollResetTimeout = null

    // Cache segments and their start times once
    this._segments = []
    this._startTimes = []
    this._cacheSegments()

    this._boundUpdate = this._update.bind(this)
    this._boundScroll = this._handleUserScroll.bind(this)

    this.audio.addEventListener('timeupdate', this._boundUpdate)

    if (this.container) {
      this.container.addEventListener('scroll', this._boundScroll, { passive: true })
    }
  }

  _cacheSegments() {
    if (!this.container) return
    this._segments = Array.from(this.container.querySelectorAll(this.options.segmentSelector))
    this._startTimes = this._segments.map(el =>
      parseFloat(el.getAttribute(this.options.startTimeAttribute))
    )
  }

  _update() {
    const time = this.audio.currentTime
    let activeIndex = -1

    // Binary search for active segment (segments are sorted by start time)
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

    // Only update the segments that changed — not all N segments
    this._updateSegmentClasses(prevIndex, activeIndex)

    if (this.options.onSegmentChange && activeIndex >= 0) {
      this.options.onSegmentChange(this._segments[activeIndex], activeIndex)
    }

    if (activeIndex >= 0 && this.autoScrollEnabled && !this.audio.paused) {
      this._scrollToSegment(this._segments[activeIndex])
    }
  }

  _updateSegmentClasses(prevIndex, newIndex) {
    const { activeClass, pastClass, futureClass } = this.options

    if (prevIndex === -1 && newIndex >= 0) {
      // First activation — set all segments
      this._segments.forEach((el, i) => {
        el.classList.toggle(activeClass, i === newIndex)
        el.classList.toggle(pastClass, i < newIndex)
        el.classList.toggle(futureClass, i > newIndex)
      })
      return
    }

    // Remove classes from previous active
    if (prevIndex >= 0 && this._segments[prevIndex]) {
      this._segments[prevIndex].classList.remove(activeClass)
    }

    // Add classes to new active
    if (newIndex >= 0 && this._segments[newIndex]) {
      this._segments[newIndex].classList.add(activeClass)
      this._segments[newIndex].classList.remove(pastClass)
      this._segments[newIndex].classList.remove(futureClass)
    }

    // Update only the segments between prev and new
    const lo = Math.min(prevIndex, newIndex)
    const hi = Math.max(prevIndex, newIndex)
    for (let i = lo; i <= hi; i++) {
      if (i === newIndex || i < 0 || !this._segments[i]) continue
      this._segments[i].classList.remove(activeClass)
      this._segments[i].classList.toggle(pastClass, i < newIndex)
      this._segments[i].classList.toggle(futureClass, i > newIndex)
    }
  }

  _scrollToSegment(segment) {
    if (!segment) return

    this._programmaticScroll = true
    segment.scrollIntoView({
      behavior: this.options.scrollBehavior,
      block: this.options.scrollBlock
    })

    clearTimeout(this._scrollResetTimeout)
    this._scrollResetTimeout = setTimeout(() => {
      this._programmaticScroll = false
    }, 1000)
  }

  _handleUserScroll() {
    if (this._programmaticScroll) return
    if (this.audio.paused) return
    if (!this.autoScrollEnabled) return

    this.autoScrollEnabled = false
    if (this.options.onAutoScrollPause) {
      this.options.onAutoScrollPause()
    }
  }

  /**
   * Re-enable auto-scrolling and immediately scroll to the active segment.
   */
  resumeAutoScroll() {
    this.autoScrollEnabled = true
    if (this.options.onAutoScrollResume) {
      this.options.onAutoScrollResume()
    }

    if (this.activeSegmentIndex >= 0 && this._segments[this.activeSegmentIndex]) {
      this._scrollToSegment(this._segments[this.activeSegmentIndex])
    }
  }

  /**
   * Re-cache segments from the DOM. Call this if the transcript content changes dynamically.
   */
  refresh() {
    this._cacheSegments()
    this.activeSegmentIndex = -1
  }

  /**
   * Whether auto-scroll is currently active.
   * @returns {boolean}
   */
  get isAutoScrolling() {
    return this.autoScrollEnabled
  }

  /**
   * Remove event listeners and clean up.
   */
  destroy() {
    this.audio.removeEventListener('timeupdate', this._boundUpdate)
    if (this.container) {
      this.container.removeEventListener('scroll', this._boundScroll)
    }
    clearTimeout(this._scrollResetTimeout)
    this._segments = []
    this._startTimes = []
  }

  /**
   * Create a TranscriptSync from a VTT/SRT string.
   * Renders transcript segments into the container automatically.
   *
   * @param {HTMLAudioElement} audio
   * @param {string} vttString - Raw VTT or SRT content
   * @param {Object} options - Same as constructor options, plus:
   * @param {Function} [options.renderSegment] - Custom renderer: (cue, element) => void
   * @returns {TranscriptSync}
   */
  static fromVTT(audio, vttString, options = {}) {
    const cues = parseVTT(vttString)
    TranscriptSync._renderCues(cues, options)
    return new TranscriptSync(audio, options)
  }

  /**
   * Create a TranscriptSync by fetching a VTT/SRT file from a URL.
   *
   * @param {HTMLAudioElement} audio
   * @param {string} url - URL to the VTT or SRT file
   * @param {Object} options - Same as constructor options, plus:
   * @param {Function} [options.renderSegment] - Custom renderer: (cue, element) => void
   * @returns {Promise<TranscriptSync>}
   */
  static async fromURL(audio, url, options = {}) {
    const cues = await fetchVTT(url)
    TranscriptSync._renderCues(cues, options)
    return new TranscriptSync(audio, options)
  }

  static _renderCues(cues, options) {
    if (!options.container) return

    const attr = options.startTimeAttribute || 'data-start-time'
    const doc = options.container.ownerDocument || document

    cues.forEach(cue => {
      const el = doc.createElement('div')
      el.setAttribute(attr, String(cue.startTime))
      el.setAttribute('data-end-time', String(cue.endTime))

      if (options.renderSegment) {
        options.renderSegment(cue, el)
      } else {
        // Default rendering
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

      options.container.appendChild(el)
    })
  }
}
