import { enrichAnnotationsWithTiming } from './timing.js'

/**
 * Visual annotation timeline with position markers and a playhead.
 *
 * Renders colored markers at annotation positions within a container element,
 * tracks audio playback with a playhead, and supports click-to-seek.
 *
 * @example
 * const timeline = new AnnotationTimeline(audioElement, {
 *   container: document.querySelector('#timeline'),
 *   annotations: [{ startTime: 45, endTime: 75, data: { type: "car" } }],
 *   duration: 2847,
 *   typeColors: { car: '#60a5fa', part: '#2dd4bf' },
 *   onSeek: (time) => { audioElement.currentTime = time }
 * })
 */
export class AnnotationTimeline {
  /**
   * @param {HTMLAudioElement} audio - The audio element to sync with
   * @param {Object} options
   * @param {HTMLElement} options.container - Container element for the timeline
   * @param {Array<{startTime: number, endTime: number, data?: {type?: string}}>} options.annotations - Annotation data
   * @param {number} [options.duration] - Total duration in seconds (auto-detected from audio if omitted)
   * @param {Object} [options.typeColors={}] - Map of annotation type to CSS color string
   * @param {string} [options.defaultColor='#fbbf24'] - Color for annotations without a type mapping
   * @param {string} [options.playheadColor='#fbbf24'] - Playhead color
   * @param {Function} [options.onSeek] - Called with (timeInSeconds) when user clicks the timeline
   * @param {string} [options.markerClass='pa-timeline-marker'] - CSS class for marker elements
   * @param {string} [options.playheadClass='pa-timeline-playhead'] - CSS class for playhead element
   */
  constructor(audio, options = {}) {
    this.audio = audio
    this.options = {
      typeColors: {},
      defaultColor: '#fbbf24',
      playheadColor: '#fbbf24',
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

    this.container.style.position = 'relative'
    this.container.innerHTML = ''

    // Render annotation markers
    this.annotations.forEach(annotation => {
      const marker = document.createElement('div')
      marker.className = this.options.markerClass
      const percent = (annotation.startTime / dur * 100).toFixed(2)
      const type = annotation.data?.type
      const color = (type && this.options.typeColors[type]) || this.options.defaultColor

      Object.assign(marker.style, {
        position: 'absolute',
        top: '0',
        left: `${percent}%`,
        width: '4px',
        height: '100%',
        borderRadius: '2px',
        background: color,
        opacity: '0.7',
        transition: 'opacity 0.15s'
      })

      marker.title = annotation.data?.title || ''
      this.container.appendChild(marker)
    })

    // Render playhead
    this.playhead = document.createElement('div')
    this.playhead.className = this.options.playheadClass
    Object.assign(this.playhead.style, {
      position: 'absolute',
      top: '-2px',
      left: '0%',
      width: '2px',
      height: 'calc(100% + 4px)',
      background: this.options.playheadColor,
      transition: 'left 0.1s linear',
      boxShadow: `0 0 6px ${this.options.playheadColor}80`,
      zIndex: '1'
    })
    this.container.appendChild(this.playhead)
  }

  _updatePlayhead() {
    if (!this.playhead) return
    const dur = this._getDuration()
    if (dur <= 0) return

    const percent = (this.audio.currentTime / dur * 100).toFixed(2)
    this.playhead.style.left = `${Math.min(parseFloat(percent), 100)}%`
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
