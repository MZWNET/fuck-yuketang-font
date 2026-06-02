import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestFont } from '../../../src/services/http/requestFont'
import { userscriptArrayBufferRequest } from '../../../src/services/http/userscriptRequest'
import { installPromiseWithResolversFallback } from '../../../src/services/platform/promiseWithResolvers'

const FONT_URL = 'https://static.yuketang.cn/fe_font/product/exam_font_abc123.ttf'

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'GM_xmlhttpRequest')
  vi.unstubAllGlobals()
})

describe('requestFont', () => {
  it('fetches font bytes with credentials when userscript transport is unavailable', async () => {
    const buffer = new ArrayBuffer(8)
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(buffer, { status: 200 }))))

    await expect(requestFont(FONT_URL)).resolves.toEqual(buffer)

    expect(fetch).toHaveBeenCalledWith(FONT_URL, { credentials: 'include' })
  })

  it('uses GM_xmlhttpRequest when available', async () => {
    installPromiseWithResolversFallback()
    const buffer = new ArrayBuffer(4)
    const requestMock = vi.fn((details: { onload: (response: { response: ArrayBuffer, status: number }) => void }) => {
      details.onload({ response: buffer, status: 200 })
    })
    vi.stubGlobal('GM_xmlhttpRequest', requestMock)

    await expect(requestFont(FONT_URL)).resolves.toBe(buffer)

    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET', url: FONT_URL }))
  })

  it('rejects failed HTTP responses from fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 500 }))))

    await expect(requestFont(FONT_URL)).rejects.toThrow('字体下载失败：HTTP 500')
  })

  it('rejects direct userscript requests when GM_xmlhttpRequest is unavailable', async () => {
    installPromiseWithResolversFallback()

    await expect(userscriptArrayBufferRequest(FONT_URL)).rejects.toThrow('GM_xmlhttpRequest 不可用')
  })
})
