import { enrichAnnotationsWithTiming, selectCurrentAnnotation, upcomingAnnotations } from './timing.js'

/**
 * Timed annotation overlays that auto-trigger during audio playback.
 *
 * Listens to an audio element's timeupdate event and fires callbacks
 * when annotations should appear, disappear, or when upcoming annotations change.
 *
 * @example
 * const overlay = new AnnotationOverlay(audioElement, {
 *   annotations: [{ startTime: 45, endTime: 75, data: { title: "LS Engine" } }],
 *   onAnnotationChange: (annotation) => renderCard(annotation),
 *   onUpcomingChange: (upcoming) => renderTeasers(upcoming)
 * })
 */
export class AnnotationOverlay {
  /**
   * @param {HTMLAudioElement} audio - The audio element to sync with
   * @param {Object} options
   * @param {Array<{startTime: number, endTime: number, data?: any}>} options.annotations - Annotation data
   * @param {HTMLElement} [options.overlayElement] - Optional element to show/hide with activeClass
   * @param {string} [options.activeClass='active'] - Class added to overlayElement when annotation is active
   * @param {string} [options.hiddenClass='hidden'] - Class added to overlayElement when no annotation
   * @param {Function} [options.onAnnotationChange] - Called with (annotation|null) when active annotation changes
   * @param {Function} [options.onUpcomingChange] - Called with (upcoming[]) when upcoming list changes
   * @param {number} [options.upcomingLimit=3] - Number of upcoming annotations to track
   * @param {number} [options.leadTime=2] - Seconds before startTime to trigger
   * @param {number} [options.transitionBuffer=5] - Gap between consecutive annotations
   * @param {number} [options.maxExtension=60] - Max seconds to extend display past endTime
   */
  constructor(audio, options = {}) {
    this.audio = audio
    this.options = {
      activeClass: 'active',
      hiddenClass: 'hidden',
      upcomingLimit: 3,
      ...options
    }

    this._timingOpts = {}
    if (options.leadTime !== undefined) this._timingOpts.leadTime = options.leadTime
    if (options.transitionBuffer !== undefined) this._timingOpts.transitionBuffer = options.transitionBuffer
    if (options.maxExtension !== undefined) this._timingOpts.maxExtension = options.maxExtension

    this.annotations = enrichAnnotationsWithTiming(options.annotations || [], this._timingOpts)

    this._displayedId = null
    this._lastUpcomingKey = null
    this._boundUpdate = this._update.bind(this)

    this.audio.addEventListener('timeupdate', this._boundUpdate)
  }

  _update() {
    const time = this.audio.currentTime
    this._updateAnnotation(time)
    this._updateUpcoming(time)
  }

  _updateAnnotation(time) {
    const current = selectCurrentAnnotation(this.annotations, time)
    const id = current ? this._annotationKey(current) : null

    if (id === this._displayedId) return
    this._displayedId = id

    if (this.options.onAnnotationChange) {
      this.options.onAnnotationChange(current)
    }

    if (this.options.overlayElement) {
      if (current) {
        this.options.overlayElement.classList.add(this.options.activeClass)
        this.options.overlayElement.classList.remove(this.options.hiddenClass)
      } else {
        this.options.overlayElement.classList.remove(this.options.activeClass)
        this.options.overlayElement.classList.add(this.options.hiddenClass)
      }
    }
  }

  _updateUpcoming(time) {
    const upcoming = upcomingAnnotations(this.annotations, time, this.options.upcomingLimit)
    const key = upcoming.map(a => this._annotationKey(a)).join(',')

    if (key === this._lastUpcomingKey) return
    this._lastUpcomingKey = key

    if (this.options.onUpcomingChange) {
      this.options.onUpcomingChange(upcoming)
    }
  }

  _annotationKey(annotation) {
    return `${annotation.startTime}:${annotation.endTime}`
  }

  /**
   * Get the currently active annotation at any point.
   * @returns {Object|null}
   */
  get currentAnnotation() {
    return selectCurrentAnnotation(this.annotations, this.audio.currentTime)
  }

  /**
   * Get upcoming annotations from current position.
   * @returns {Array}
   */
  get upcoming() {
    return upcomingAnnotations(this.annotations, this.audio.currentTime, this.options.upcomingLimit)
  }

  /**
   * Replace annotations at runtime.
   * @param {Array} annotations - New annotation data
   */
  setAnnotations(annotations) {
    this.annotations = enrichAnnotationsWithTiming(annotations, this._timingOpts)
    this._displayedId = null
    this._lastUpcomingKey = null
    this._update()
  }

  /**
   * Remove event listeners and clean up.
   */
  destroy() {
    this.audio.removeEventListener('timeupdate', this._boundUpdate)
  }
}
