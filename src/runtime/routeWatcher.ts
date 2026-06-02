import { ROUTE_POLL_INTERVAL_MS } from '../constants/userscript'

export function startRouteWatcher(onRouteChange: (url: string) => void): number {
  return window.setInterval(() => {
    onRouteChange(location.href)
  }, ROUTE_POLL_INTERVAL_MS)
}
