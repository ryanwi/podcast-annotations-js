/**
 * Format seconds into a human-readable time string.
 * @param {number} seconds
 * @returns {string} e.g. "1:23" or "1:02:03"
 */
export function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
