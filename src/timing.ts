import type { Annotation, EnrichedAnnotation, TimingOptions } from './types.js'

const DEFAULTS: Required<TimingOptions> = {
  leadTime: 2,
  transitionBuffer: 5,
  maxExtension: 60
}

/**
 * Enrich annotations with computed trigger and display timing windows.
 */
export function enrichAnnotationsWithTiming(
  annotations: Annotation[],
  options: TimingOptions = {}
): EnrichedAnnotation[] {
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
      id: annotation.id ?? `_pa_${index}`,
      triggerStartTime: annotation.startTime - leadTime,
      displayEndTime
    }
  })
}

/**
 * Find the currently active annotation at a given time.
 */
export function selectCurrentAnnotation(
  annotations: EnrichedAnnotation[],
  currentTime: number
): EnrichedAnnotation | null {
  return annotations.findLast((a) =>
    currentTime >= a.triggerStartTime && currentTime <= a.displayEndTime
  ) ?? null
}

/**
 * Get annotations coming up after the current time.
 */
export function upcomingAnnotations(
  annotations: EnrichedAnnotation[],
  currentTime: number,
  limit: number = 3
): EnrichedAnnotation[] {
  return annotations
    .filter((a) => a.startTime > currentTime)
    .slice(0, limit)
}
