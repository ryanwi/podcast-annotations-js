/**
 * Core timing functions for podcast annotations.
 * Determines when annotations should trigger, display, and transition.
 */

const DEFAULTS = {
  leadTime: 2,
  transitionBuffer: 5,
  maxExtension: 60
}

/**
 * Enrich annotations with computed trigger and display timing windows.
 *
 * Each annotation gets:
 * - `triggerStartTime`: when to start showing (startTime - leadTime)
 * - `displayEndTime`: when to stop showing (extended past endTime, capped by next annotation or maxExtension)
 *
 * @param {Array<{startTime: number, endTime: number, data?: any}>} annotations
 * @param {Object} [options]
 * @param {number} [options.leadTime=2] - Seconds before startTime to trigger display
 * @param {number} [options.transitionBuffer=5] - Minimum gap between consecutive annotations
 * @param {number} [options.maxExtension=60] - Maximum seconds to extend display past endTime
 * @returns {Array} Sorted annotations with triggerStartTime and displayEndTime added
 */
export function enrichAnnotationsWithTiming(annotations, options = {}) {
  const { leadTime, transitionBuffer, maxExtension } = { ...DEFAULTS, ...options }
  const sorted = [...annotations].sort((a, b) => a.startTime - b.startTime)

  return sorted.map((annotation, index) => {
    const nextAnnotation = sorted[index + 1]
    const cappedEndTime = annotation.endTime + maxExtension
    const nextBasedEndTime = nextAnnotation
      ? nextAnnotation.startTime - transitionBuffer
      : cappedEndTime
    const displayEndTime = Math.max(
      annotation.endTime,
      Math.min(nextBasedEndTime, cappedEndTime)
    )

    return {
      ...annotation,
      triggerStartTime: annotation.startTime - leadTime,
      displayEndTime
    }
  })
}

/**
 * Find the currently active annotation at a given time.
 *
 * @param {Array} annotations - Enriched annotations (from enrichAnnotationsWithTiming)
 * @param {number} currentTime - Current audio playback time in seconds
 * @returns {Object|null} The active annotation, or null
 */
export function selectCurrentAnnotation(annotations, currentTime) {
  return annotations.findLast((annotation) =>
    currentTime >= annotation.triggerStartTime && currentTime <= annotation.displayEndTime
  ) || null
}

/**
 * Get annotations coming up after the current time.
 *
 * @param {Array} annotations - Enriched annotations
 * @param {number} currentTime - Current audio playback time in seconds
 * @param {number} [limit=3] - Maximum number of upcoming annotations to return
 * @returns {Array} Next annotations sorted by startTime
 */
export function upcomingAnnotations(annotations, currentTime, limit = 3) {
  return annotations
    .filter((annotation) => annotation.startTime > currentTime)
    .slice(0, limit)
}
