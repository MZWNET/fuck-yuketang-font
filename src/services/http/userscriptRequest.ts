interface XmlHttpResponse {
  response: ArrayBuffer
  status: number
}

interface XmlHttpRequestDetails {
  method: 'GET'
  url: string
  responseType: 'arraybuffer'
  onload: (response: XmlHttpResponse) => void
  onerror: (error: unknown) => void
}

declare global {
  const GM_xmlhttpRequest: ((details: XmlHttpRequestDetails) => void) | undefined
}

export function canUseUserscriptRequest(): boolean {
  return typeof GM_xmlhttpRequest === 'function'
}

export function userscriptArrayBufferRequest(url: string): Promise<ArrayBuffer> {
  if (typeof GM_xmlhttpRequest !== 'function')
    return Promise.reject(new Error('GM_xmlhttpRequest 不可用'))

  const { promise, resolve, reject } = Promise.withResolvers<ArrayBuffer>()
  GM_xmlhttpRequest({
    method: 'GET',
    url,
    responseType: 'arraybuffer',
    onload: (response) => {
      if (response.status >= 200 && response.status < 300)
        resolve(response.response)
      else reject(new Error(`字体下载失败：HTTP ${response.status}`))
    },
    onerror: reject,
  })
  return promise
}
