import { describe, it, expect } from 'vitest'
import { enrichAnnotationsWithTiming, selectCurrentAnnotation, upcomingAnnotations } from '../src/timing.js'

describe('enrichAnnotationsWithTiming', () => {
  it('sorts by startTime and adds trigger/display times', () => {
    const input = [
      { startTime: 60, endTime: 90 },
      { startTime: 10, endTime: 30 }
    ]
    const result = enrichAnnotationsWithTiming(input)

    expect(result[0].startTime).toBe(10)
    expect(result[1].startTime).toBe(60)
    expect(result[0].triggerStartTime).toBe(8) // 10 - 2
    expect(result[1].triggerStartTime).toBe(58) // 60 - 2
  })

  it('extends displayEndTime up to next annotation minus buffer', () => {
    const input = [
      { startTime: 10, endTime: 30 },
      { startTime: 50, endTime: 70 }
    ]
    const result = enrichAnnotationsWithTiming(input)

    // First: extended to 50 - 5 = 45
    expect(result[0].displayEndTime).toBe(45)
  })

  it('caps displayEndTime at endTime + maxExtension', () => {
    const input = [
      { startTime: 10, endTime: 30 },
      { startTime: 200, endTime: 220 }
    ]
    const result = enrichAnnotationsWithTiming(input)

    // First: next is at 200, but max extension is 30 + 60 = 90
    expect(result[0].displayEndTime).toBe(90)
  })

  it('uses custom timing options', () => {
    const input = [{ startTime: 10, endTime: 30 }]
    const result = enrichAnnotationsWithTiming(input, { leadTime: 5, maxExtension: 10 })

    expect(result[0].triggerStartTime).toBe(5) // 10 - 5
    expect(result[0].displayEndTime).toBe(40) // 30 + 10
  })

  it('preserves data field', () => {
    const input = [{ startTime: 10, endTime: 30, data: { title: 'Test' } }]
    const result = enrichAnnotationsWithTiming(input)

    expect(result[0].data.title).toBe('Test')
  })

  it('handles empty array', () => {
    expect(enrichAnnotationsWithTiming([])).toEqual([])
  })
})

describe('selectCurrentAnnotation', () => {
  const annotations = enrichAnnotationsWithTiming([
    { startTime: 10, endTime: 30, data: { id: 'a' } },
    { startTime: 50, endTime: 70, data: { id: 'b' } }
  ])

  it('returns null before any annotation', () => {
    expect(selectCurrentAnnotation(annotations, 0)).toBeNull()
  })

  it('returns annotation during its trigger window', () => {
    const result = selectCurrentAnnotation(annotations, 9) // triggerStartTime = 8
    expect(result.data.id).toBe('a')
  })

  it('returns annotation during its display window', () => {
    const result = selectCurrentAnnotation(annotations, 40)
    expect(result.data.id).toBe('a')
  })

  it('returns second annotation when in its window', () => {
    const result = selectCurrentAnnotation(annotations, 55)
    expect(result.data.id).toBe('b')
  })

  it('returns null after all annotations', () => {
    expect(selectCurrentAnnotation(annotations, 200)).toBeNull()
  })
})

describe('upcomingAnnotations', () => {
  const annotations = enrichAnnotationsWithTiming([
    { startTime: 10, endTime: 30, data: { id: 'a' } },
    { startTime: 50, endTime: 70, data: { id: 'b' } },
    { startTime: 90, endTime: 110, data: { id: 'c' } },
    { startTime: 130, endTime: 150, data: { id: 'd' } }
  ])

  it('returns next annotations after current time', () => {
    const result = upcomingAnnotations(annotations, 0)
    expect(result).toHaveLength(3)
    expect(result[0].data.id).toBe('a')
  })

  it('respects limit parameter', () => {
    const result = upcomingAnnotations(annotations, 0, 2)
    expect(result).toHaveLength(2)
  })

  it('excludes annotations at or before current time', () => {
    const result = upcomingAnnotations(annotations, 50)
    expect(result).toHaveLength(2)
    expect(result[0].data.id).toBe('c')
  })

  it('returns empty array after all annotations', () => {
    expect(upcomingAnnotations(annotations, 200)).toEqual([])
  })
})
