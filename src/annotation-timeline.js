import { enrichAnnotationsWithTiming } from './timing.js'

/**
 * Visual annotation timeline with position markers and a playhead.
 *
 * Renders markers as DOM elements with CSS classes and data attributes.
 * All visual styling is controlled via CSS — the library only sets `left` position
 * and data attributes for type-based styling.
 *
 * Minimal CSS to get started:
 * ```css
 * .pa-timeline { position: relative; height: 6px; background: #333; cursor: pointer; }
 * .pa-timeline-marker { position: absolute; top: 0; width: 4px; height: 100%; border-radius: 2px; background: #fbbf24; }
 * .pa-timeline-playhead { position: absolute; top: -2px; width: 2px; height: calc(100% + 4px); background: #fbbf24; }
 * ```
 *
 * @example
 * const timeline = new AnnotationTimeline(audioElement, {
 *   container: document.querySelector('#timeline'),
 *   annotations: [{ startTime: 45, endTime: 75, data: { type: "car" } }],
 *   duration: 2847,
 *   onSeek: (time) => { audioElement.currentTime = time }
 * })
 */
export class AnnotationTimeline {
  /**
   * @param {HTMLAudioElement} audio - The audio element to sync with
   * @param {Object} options
   * @param {HTMLElement} options.container - Container element for the timeline
   * @param {Array<{startTime: number, endTime: number, data?: {type?: string, title?: string}}>} options.annotations
   * @param {number} [options.duration] - Total duration in seconds (auto-detected from audio if omitted)
   * @param {Function} [options.onSeek] - Called with (timeInSeconds) when user clicks the timeline
   * @param {string} [options.markerClass='pa-timeline-marker'] - CSS class for marker elements
   * @param {string} [options.playheadClass='pa-timeline-playhead'] - CSS class for playhead element
   * @param {Function} [options.renderMarker] - Custom marker renderer: (annotation, markerElement) => void
   */
  constructor(audio, options = {}) {
    this.audio = audio
    this.options = {
      markerClass: 'pa-timeline-marker',
      playheadClass: 'pa-timeline-playhead',
      ...options
    }

    this.container = options.container
    this.duration = options.duration || 0
    this.annotations = enrichAnnotationsWithTiming(options.annotations || [])

    this._boundUpdate = this._updatePlayhead.bind(this)
    this._boundClick = this._handleClick.bind(this)
    this._boundMetadata = this._handleMetadata.bind(this)

    if (this.container) {
      this._render()
      this.container.addEventListener('click', this._boundClick)
    }

    this.audio.addEventListener('timeupdate', this._boundUpdate)
    this.audio.addEventListener('loadedmetadata', this._boundMetadata)
  }

  _getDuration() {
    if (this.duration > 0) return this.duration
    if (this.audio.duration && isFinite(this.audio.duration)) return this.audio.duration
    return 0
  }

  _handleMetadata() {
    if (!this.duration && this.audio.duration && isFinite(this.audio.duration)) {
      this.duration = this.audio.duration
      this._render()
    }
  }

  _render() {
    if (!this.container) return
    const dur = this._getDuration()
    if (dur <= 0) return

    this.container.innerHTML = ''

    // Render annotation markers with data attributes — no inline styles except position
    this.annotations.forEach(annotation => {
      const marker = document.createElement('div')
      marker.className = this.options.markerClass
      marker.style.left = `${(annotation.startTime / dur * 100).toFixed(2)}%`

      // Data attributes for CSS-based styling
      if (annotation.data?.type) {
        marker.dataset.type = annotation.data.type
      }
      if (annotation.data?.title) {
        marker.title = annotation.data.title
      }

      // Allow custom rendering
      if (this.options.renderMarker) {
        this.options.renderMarker(annotation, marker)
      }

      this.container.appendChild(marker)
    })

    // Render playhead
    this.playhead = document.createElement('div')
    this.playhead.className = this.options.playheadClass
    this.playhead.style.left = '0%'
    this.container.appendChild(this.playhead)
  }

  _updatePlayhead() {
    if (!this.playhead) return
    const dur = this._getDuration()
    if (dur <= 0) return

    const percent = Math.min(this.audio.currentTime / dur * 100, 100)
    this.playhead.style.left = `${percent.toFixed(2)}%`
  }

  _handleClick(event) {
    const dur = this._getDuration()
    if (dur <= 0) return

    const rect = this.container.getBoundingClientRect()
    const x = event.clientX - rect.left
    const percent = x / rect.width
    const time = percent * dur

    if (this.options.onSeek) {
      this.options.onSeek(time)
    }
  }

  /**
   * Replace annotations and re-render the timeline.
   * @param {Array} annotations - New annotation data
   */
  setAnnotations(annotations) {
    this.annotations = enrichAnnotationsWithTiming(annotations)
    this._render()
  }

  /**
   * Remove event listeners and clean up.
   */
  destroy() {
    this.audio.removeEventListener('timeupdate', this._boundUpdate)
    this.audio.removeEventListener('loadedmetadata', this._boundMetadata)
    if (this.container) {
      this.container.removeEventListener('click', this._boundClick)
      this.container.innerHTML = ''
    }
  }
}
