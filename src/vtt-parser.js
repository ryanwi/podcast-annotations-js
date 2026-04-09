/**
 * Lightweight WebVTT parser. Extracts cues with start/end times, speaker, and text.
 * Also supports SRT files (auto-detected by timestamp format).
 *
 * @param {string} vttString - Raw VTT or SRT file content
 * @returns {Array<{startTime: number, endTime: number, text: string, speaker: string|null}>}
 */
export function parseVTT(vttString) {
  const lines = vttString.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const cues = []
  let i = 0

  // Skip WEBVTT header and any metadata
  while (i < lines.length && !lines[i].includes('-->')) {
    i++
  }

  while (i < lines.length) {
    const line = lines[i].trim()

    // Look for timestamp lines: "00:00:05.000 --> 00:00:10.000"
    const match = line.match(
      /^(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})/
    )

    if (match) {
      const startTime = parseTimestamp(match[1], match[2], match[3], match[4])
      const endTime = parseTimestamp(match[5], match[6], match[7], match[8])

      // Collect text lines until blank line or end
      i++
      const textLines = []
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim())
        i++
      }

      const rawText = textLines.join(' ')

      // Extract speaker from VTT voice tag: <v Speaker Name>text
      let speaker = null
      let text = rawText

      const voiceMatch = rawText.match(/^<v\s+([^>]+)>(.*)$/)
      if (voiceMatch) {
        speaker = voiceMatch[1].trim()
        text = voiceMatch[2].trim()
      }

      // Strip any remaining VTT tags like <c>, <b>, etc.
      text = text.replace(/<[^>]+>/g, '').trim()

      if (text) {
        cues.push({ startTime, endTime, text, speaker })
      }
    } else {
      i++
    }
  }

  return cues
}

function parseTimestamp(hours, minutes, seconds, millis) {
  const h = hours ? parseInt(hours.replace(':', ''), 10) : 0
  const m = parseInt(minutes, 10)
  const s = parseInt(seconds, 10)
  const ms = parseInt(millis, 10)
  return h * 3600 + m * 60 + s + ms / 1000
}

/**
 * Fetch and parse a VTT/SRT file from a URL.
 *
 * @param {string} url - URL to the VTT or SRT file
 * @returns {Promise<Array<{startTime: number, endTime: number, text: string, speaker: string|null}>>}
 */
export async function fetchVTT(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch VTT: ${response.status} ${response.statusText}`)
  }
  const text = await response.text()
  return parseVTT(text)
}
