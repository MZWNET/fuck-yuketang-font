import type { DecryptionMap, DecryptionMap as RuntimeMap } from '../../src/core/font'

import type { UserscriptRuntime } from '../../src/runtime'
import type { DecryptStatus } from '../../src/runtime/statusBus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTROL_EVENT, createUserscriptRuntime, STATUS_EVENT } from '../../src/runtime'

const { decryptFontMock, decryptTextMock } = vi.hoisted(() => ({
  decryptFontMock: vi.fn<(buffer: ArrayBuffer) => Promise<RuntimeMap>>(),
  decryptTextMock: vi.fn<(text: string, map: RuntimeMap) => string>(),
}))

vi.mock('../../src/core/font', () => ({
  decryptFont: decryptFontMock,
  decryptText: decryptTextMock,
}))

const FONT_URL = 'https://static.yuketang.cn/fe_font/product/exam_font_abc123.ttf'
const NEXT_FONT_URL = 'https://static.yuketang.cn/fe_font/product/exam_font_next456.ttf'

let runtime: UserscriptRuntime | undefined

beforeEach(() => {
  vi.useFakeTimers()
  document.head.replaceChildren()
  document.body.replaceChildren()
  Reflect.deleteProperty(globalThis, 'GM_xmlhttpRequest')
  decryptFontMock.mockReset()
  decryptFontMock.mockResolvedValue(new Map([[0xE001, 0x4F60]]))
  decryptTextMock.mockReset()
  decryptTextMock.mockReturnValue('解密文本')
})

afterEach(() => {
  runtime?.dispose()
  runtime = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('userscript runtime', () => {
  it('polls style tags and waits for the user to enable decryption before decrypting spans', async () => {
    const statuses: DecryptStatus[] = []
    window.addEventListener(STATUS_EVENT, event => statuses.push((event as CustomEvent<DecryptStatus>).detail))
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(8), { status: 200 }))))

    document.head.append(styleWithFont(FONT_URL))
    const span = encryptedSpan()
    document.body.append(span)

    runtime = createUserscriptRuntime()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(FONT_URL, { credentials: 'include' })
    expect(decryptFontMock).toHaveBeenCalledWith(expect.any(ArrayBuffer))
    expect(decryptTextMock).not.toHaveBeenCalled()
    expect(span.textContent).toBe('\uE001')

    enableDecryption()
    await flushPromises()

    expect(decryptTextMock).toHaveBeenCalledWith('\uE001', expect.any(Map))
    expect(span.textContent).toBe('解密文本')
    expect(span.classList.contains('xuetangx-com-encrypted-font')).toBe(false)
    expect(statuses.map(status => status.message)).toContain('已解密 1 段文本')
    expect(statuses.at(-1)?.decryptedTexts).toEqual(['解密文本'])
  })

  it('uses GM_xmlhttpRequest when available and scans nodes inserted by mutation observers', async () => {
    const requestMock = vi.fn((details: { onload: (response: { response: ArrayBuffer, status: number }) => void }) => {
      details.onload({ response: new ArrayBuffer(4), status: 200 })
    })
    vi.stubGlobal('GM_xmlhttpRequest', requestMock)

    runtime = createUserscriptRuntime()
    enableDecryption()
    document.body.append(styleWithFont(FONT_URL))
    const span = encryptedSpan()
    document.body.append(span)
    await flushPromises()
    await flushPromises()

    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET', url: FONT_URL }))
    expect(span.textContent).toBe('解密文本')
  })

  it('retries failed decryptions after later encrypted-node mutations', async () => {
    const errorSpy = expectExpectedDecryptErrorLog()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(8), { status: 200 }))))
    decryptTextMock.mockImplementationOnce(() => {
      throw new Error('bad glyph')
    })

    document.head.append(styleWithFont(FONT_URL))
    const span = encryptedSpan()
    document.body.append(span)

    runtime = createUserscriptRuntime()
    enableDecryption()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(span.classList.contains('xuetangx-com-encrypted-font')).toBe(true)

    document.body.append(encryptedSpan())
    await flushPromises()
    expect(errorSpy).toHaveBeenCalledWith('雨课堂字形解密失败', expect.any(Error))
    expect(decryptTextMock).toHaveBeenCalledTimes(3)
    expect(span.textContent).toBe('解密文本')
  })

  it('resets cached font state when the single-page app route changes', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(8), { status: 200 }))))
    document.head.append(styleWithFont(FONT_URL))

    runtime = createUserscriptRuntime()
    enableDecryption()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(decryptFontMock).toHaveBeenCalledTimes(1)

    history.pushState({}, '', '/next')
    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    expect(decryptFontMock).toHaveBeenCalledTimes(2)
  })

  it('keeps retrying when font downloads fail', async () => {
    const errorSpy = expectExpectedDecryptErrorLog()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 500 }))))
    document.head.append(styleWithFont(FONT_URL))
    document.body.append(encryptedSpan())

    runtime = createUserscriptRuntime()
    enableDecryption()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(decryptTextMock).not.toHaveBeenCalled()

    document.body.append(encryptedSpan())
    await flushPromises()
    expect(errorSpy).toHaveBeenCalledWith('雨课堂字形解密失败', expect.any(Error))
    expect(decryptTextMock).not.toHaveBeenCalled()
  })

  it('handles mutation branches that should not start decryption', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(8), { status: 200 }))))
    runtime = createUserscriptRuntime()

    runtime.scanAndDecrypt()
    document.body.append(document.createTextNode('plain'))
    const style = document.createElement('style')
    style.textContent = '@font-face{font-family:test}'
    document.body.append(style)
    await flushPromises()

    expect(decryptFontMock).not.toHaveBeenCalled()
  })

  it('keeps the current font promise when the same font url is observed again', async () => {
    const requestMock = vi.fn((details: { onload: (response: { response: ArrayBuffer, status: number }) => void }) => {
      details.onload({ response: new ArrayBuffer(4), status: 200 })
    })
    vi.stubGlobal('GM_xmlhttpRequest', requestMock)

    runtime = createUserscriptRuntime()
    document.body.append(styleWithFont(FONT_URL))
    await flushPromises()
    document.body.append(styleWithFont(FONT_URL))
    await flushPromises()

    expect(requestMock).toHaveBeenCalledTimes(1)
  })

  it('reports GM_xmlhttpRequest transport errors', async () => {
    const errorSpy = expectExpectedDecryptErrorLog()
    const statuses: DecryptStatus[] = []
    window.addEventListener(STATUS_EVENT, event => statuses.push((event as CustomEvent<DecryptStatus>).detail))
    vi.stubGlobal(
      'GM_xmlhttpRequest',
      vi.fn((details: { onerror: (error: unknown) => void }) => {
        details.onerror(new Error('network'))
      }),
    )

    document.head.append(styleWithFont(FONT_URL))
    document.body.append(encryptedSpan())

    runtime = createUserscriptRuntime()
    enableDecryption()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    expect(errorSpy).toHaveBeenCalledWith('雨课堂字形解密失败', expect.any(Error))
    expect(statuses.map(status => status.message)).toContain('解密失败，等待页面或字体刷新后重试')
  })

  it('ignores stale decryptions after the active font changes', async () => {
    const { promise, resolve } = Promise.withResolvers<DecryptionMap>()
    decryptFontMock.mockReturnValueOnce(promise)
    decryptFontMock.mockResolvedValue(new Map([[0xE001, 0x4F60]]))
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(8), { status: 200 }))))

    document.head.append(styleWithFont(FONT_URL))
    const span = encryptedSpan()
    document.body.append(span)

    runtime = createUserscriptRuntime()
    enableDecryption()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    document.head.replaceChildren(styleWithFont(NEXT_FONT_URL))
    history.pushState({}, '', '/changed-font')
    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    resolve(new Map([[0xE001, 0x4F60]]))
    await flushPromises()

    expect(decryptFontMock).toHaveBeenCalledTimes(2)
    expect(span.classList.contains('xuetangx-com-encrypted-font')).toBe(false)
  })

  it('reports GM_xmlhttpRequest HTTP failures', async () => {
    const errorSpy = expectExpectedDecryptErrorLog()
    const statuses: DecryptStatus[] = []
    window.addEventListener(STATUS_EVENT, event => statuses.push((event as CustomEvent<DecryptStatus>).detail))
    vi.stubGlobal(
      'GM_xmlhttpRequest',
      vi.fn((details: { onload: (response: { response: ArrayBuffer, status: number }) => void }) => {
        details.onload({ response: new ArrayBuffer(0), status: 500 })
      }),
    )

    document.head.append(styleWithFont(FONT_URL))
    document.body.append(encryptedSpan())

    runtime = createUserscriptRuntime()
    enableDecryption()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    expect(errorSpy).toHaveBeenCalledWith('雨课堂字形解密失败', expect.any(Error))
    expect(statuses.map(status => status.message)).toContain('解密失败，等待页面或字体刷新后重试')
  })

  it('installs a Promise.withResolvers fallback when the runtime lacks one', async () => {
    const nativeWithResolvers = Promise.withResolvers
    Reflect.deleteProperty(Promise, 'withResolvers')
    vi.stubGlobal(
      'GM_xmlhttpRequest',
      vi.fn((details: { onload: (response: { response: ArrayBuffer, status: number }) => void }) => {
        details.onload({ response: new ArrayBuffer(4), status: 200 })
      }),
    )

    document.head.append(styleWithFont(FONT_URL))
    document.body.append(encryptedSpan())

    runtime = createUserscriptRuntime()
    enableDecryption()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    expect(Promise.withResolvers).toBeTypeOf('function')
    Promise.withResolvers = nativeWithResolvers
  })

  it('skips duplicate encrypted-node scans while decryption is in flight', async () => {
    const { promise, resolve } = Promise.withResolvers<DecryptionMap>()
    decryptFontMock.mockReturnValueOnce(promise)
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(8), { status: 200 }))))

    document.head.append(styleWithFont(FONT_URL))
    const span = encryptedSpan()
    document.body.append(span)

    runtime = createUserscriptRuntime()
    enableDecryption()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    runtime.scanAndDecrypt()
    runtime.scanAndDecrypt()
    resolve(new Map([[0xE001, 0x4F60]]))
    await flushPromises()

    expect(decryptTextMock).toHaveBeenCalledTimes(1)
    expect(span.textContent).toBe('解密文本')
  })

  it('does not mutate text when disposed before font resolution', async () => {
    const { promise, resolve } = Promise.withResolvers<DecryptionMap>()
    decryptFontMock.mockReturnValueOnce(promise)
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(8), { status: 200 }))))

    document.head.append(styleWithFont(FONT_URL))
    const span = encryptedSpan()
    document.body.append(span)

    runtime = createUserscriptRuntime()
    enableDecryption()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    runtime.dispose()
    resolve(new Map([[0xE001, 0x4F60]]))
    await flushPromises()

    expect(decryptTextMock).not.toHaveBeenCalled()
    expect(span.textContent).toBe('\uE001')
  })

  it('retries a pending encrypted node after decryption is paused and re-enabled', async () => {
    const { promise, resolve } = Promise.withResolvers<DecryptionMap>()
    decryptFontMock.mockReturnValueOnce(promise)
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(8), { status: 200 }))))

    document.head.append(styleWithFont(FONT_URL))
    const span = encryptedSpan()
    document.body.append(span)

    runtime = createUserscriptRuntime()
    enableDecryption()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    disableDecryption()
    resolve(new Map([[0xE001, 0x4F60]]))
    await flushPromises()

    expect(decryptTextMock).not.toHaveBeenCalled()
    expect(span.textContent).toBe('\uE001')

    enableDecryption()
    await flushPromises()

    expect(decryptTextMock).toHaveBeenCalledWith('\uE001', expect.any(Map))
    expect(span.textContent).toBe('解密文本')
  })

  it('clears polling timers on dispose', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(8), { status: 200 }))))

    runtime = createUserscriptRuntime()
    runtime.dispose()
    document.head.append(styleWithFont(FONT_URL))
    await vi.advanceTimersByTimeAsync(1500)
    await flushPromises()

    expect(fetch).not.toHaveBeenCalled()
    expect(decryptFontMock).not.toHaveBeenCalled()
  })

  it('polls again without a font url and clears the old poll timer after route changes', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(8), { status: 200 }))))

    runtime = createUserscriptRuntime()
    await vi.advanceTimersByTimeAsync(500)
    history.pushState({}, '', '/no-font-yet')
    await vi.advanceTimersByTimeAsync(500)
    document.head.append(styleWithFont(FONT_URL))
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(decryptFontMock).toHaveBeenCalledTimes(1)
  })

  it('decrypts an encrypted element with null text content as an empty string', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(8), { status: 200 }))))
    document.head.append(styleWithFont(FONT_URL))
    const span = encryptedSpan()
    span.textContent = null
    document.body.append(span)

    runtime = createUserscriptRuntime()
    enableDecryption()
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    expect(decryptTextMock).toHaveBeenCalledWith('', expect.any(Map))
  })
})

function styleWithFont(url: string): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = `@font-face{font-family:test;src:url(${url})}`
  return style
}

function encryptedSpan(): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = 'xuetangx-com-encrypted-font'
  span.textContent = '\uE001'
  return span
}

function expectExpectedDecryptErrorLog() {
  return vi.spyOn(console, 'error').mockImplementation(() => undefined)
}

function enableDecryption(): void {
  window.dispatchEvent(new CustomEvent(CONTROL_EVENT, { detail: { enabled: true } }))
}

function disableDecryption(): void {
  window.dispatchEvent(new CustomEvent(CONTROL_EVENT, { detail: { enabled: false } }))
}

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}
