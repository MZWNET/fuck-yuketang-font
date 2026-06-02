import { canUseUserscriptRequest, userscriptArrayBufferRequest } from './userscriptRequest'

export function requestFont(url: string): Promise<ArrayBuffer> {
  if (canUseUserscriptRequest())
    return userscriptArrayBufferRequest(url)

  return fetch(url, { credentials: 'include' }).then((response) => {
    if (!response.ok)
      throw new Error(`字体下载失败：HTTP ${response.status}`)
    return response.arrayBuffer()
  })
}
