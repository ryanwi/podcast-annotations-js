import { describe, it, expect } from 'vitest'
import { parseVTT } from '../src/vtt-parser.js'

describe('parseVTT', () => {
  it('parses a basic VTT file', () => {
    const vtt = `WEBVTT

00:00:05.000 --> 00:00:10.000
Welcome to the show.

00:00:10.500 --> 00:00:15.000
Thanks for having me.
`
    const cues = parseVTT(vtt)
    expect(cues).toHaveLength(2)
    expect(cues[0]).toEqual({
      startTime: 5,
      endTime: 10,
      text: 'Welcome to the show.',
      speaker: null
    })
    expect(cues[1].startTime).toBe(10.5)
  })

  it('parses VTT voice tags for speakers', () => {
    const vtt = `WEBVTT

00:00:05.000 --> 00:00:10.000
<v Alex>Welcome to the show.

00:00:10.500 --> 00:00:15.000
<v Tyler>Thanks for having me.
`
    const cues = parseVTT(vtt)
    expect(cues[0].speaker).toBe('Alex')
    expect(cues[0].text).toBe('Welcome to the show.')
    expect(cues[1].speaker).toBe('Tyler')
  })

  it('parses hour-long timestamps', () => {
    const vtt = `WEBVTT

1:30:05.500 --> 1:30:10.000
Deep into the episode now.
`
    const cues = parseVTT(vtt)
    expect(cues[0].startTime).toBe(5405.5) // 1*3600 + 30*60 + 5.5
    expect(cues[0].endTime).toBe(5410)
  })

  it('parses SRT format (comma separator)', () => {
    const srt = `1
00:00:05,000 --> 00:00:10,000
Welcome to the show.

2
00:00:10,500 --> 00:00:15,000
Thanks for having me.
`
    const cues = parseVTT(srt)
    expect(cues).toHaveLength(2)
    expect(cues[0].startTime).toBe(5)
    expect(cues[0].text).toBe('Welcome to the show.')
  })

  it('strips VTT formatting tags', () => {
    const vtt = `WEBVTT

00:00:05.000 --> 00:00:10.000
This is <b>bold</b> and <c.highlight>highlighted</c> text.
`
    const cues = parseVTT(vtt)
    expect(cues[0].text).toBe('This is bold and highlighted text.')
  })

  it('handles multi-line cues', () => {
    const vtt = `WEBVTT

00:00:05.000 --> 00:00:10.000
First line
second line
`
    const cues = parseVTT(vtt)
    expect(cues[0].text).toBe('First line second line')
  })

  it('skips VTT metadata headers', () => {
    const vtt = `WEBVTT
Kind: captions
Language: en

00:00:05.000 --> 00:00:10.000
First cue.
`
    const cues = parseVTT(vtt)
    expect(cues).toHaveLength(1)
    expect(cues[0].text).toBe('First cue.')
  })

  it('handles empty input', () => {
    expect(parseVTT('')).toEqual([])
    expect(parseVTT('WEBVTT\n\n')).toEqual([])
  })

  it('handles Windows line endings', () => {
    const vtt = 'WEBVTT\r\n\r\n00:00:05.000 --> 00:00:10.000\r\nHello.\r\n'
    const cues = parseVTT(vtt)
    expect(cues).toHaveLength(1)
    expect(cues[0].text).toBe('Hello.')
  })
})
