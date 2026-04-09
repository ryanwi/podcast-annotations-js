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

    this._boundUpdate = this._update.bind(this)
    this._boundScroll = this._handleUserScroll.bind(this)

    this.audio.addEventListener('timeupdate', this._boundUpdate)

    if (this.container) {
      this.container.addEventListener('scroll', this._boundScroll, { passive: true })
    }
  }

  _getSegments() {
    if (!this.container) return []
    return Array.from(this.container.querySelectorAll(this.options.segmentSelector))
  }

  _update() {
    const time = this.audio.currentTime
    const segments = this._getSegments()
    let activeIndex = -1

    for (let i = segments.length - 1; i >= 0; i--) {
      const start = parseFloat(segments[i].getAttribute(this.options.startTimeAttribute))
      if (time >= start) {
        activeIndex = i
        break
      }
    }

    if (activeIndex === this.activeSegmentIndex) return
    this.activeSegmentIndex = activeIndex

    segments.forEach((el, i) => {
      el.classList.toggle(this.options.activeClass, i === activeIndex)
      el.classList.toggle(this.options.pastClass, i < activeIndex)
      el.classList.toggle(this.options.futureClass, i > activeIndex)
    })

    if (this.options.onSegmentChange && activeIndex >= 0) {
      this.options.onSegmentChange(segments[activeIndex], activeIndex)
    }

    if (activeIndex >= 0 && this.autoScrollEnabled && !this.audio.paused) {
      this._scrollToSegment(segments[activeIndex])
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

    const segments = this._getSegments()
    if (this.activeSegmentIndex >= 0 && segments[this.activeSegmentIndex]) {
      this._scrollToSegment(segments[this.activeSegmentIndex])
    }
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
  }
}
