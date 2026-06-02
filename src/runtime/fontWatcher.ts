import { FONT_POLL_INTERVAL_MS } from '../constants/userscript'
import { extractFontUrl } from '../services/dom/fontUrlExtractor'

export interface FontWatcher {
  start: () => void
  stop: () => void
}

export function createFontWatcher(onFontUrl: (url: string) => void, onReady: () => void): FontWatcher {
  let pollTimer: number | undefined

  const stop = (): void => {
    if (pollTimer === undefined)
      return

    window.clearInterval(pollTimer)
    pollTimer = undefined
  }

  return {
    start: () => {
      stop()

      pollTimer = window.setInterval(() => {
        const url = extractFontUrl()
        if (url === undefined)
          return

        onFontUrl(url)
        stop()
        onReady()
      }, FONT_POLL_INTERVAL_MS)
    },
    stop,
  }
}
