import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('main.tsx entrypoint', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    document.head.replaceChildren()
    document.body.replaceChildren()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(0), { status: 404 }))))
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.head.replaceChildren()
    document.body.replaceChildren()
  })

  it('starts the userscript runtime and renders the Solid status panel into a root div', async () => {
    // Dynamic import is required here because this test verifies module-load side effects after jsdom setup.
    await import('../src/main.tsx')

    const root = document.body.querySelector<HTMLDivElement>('#fuck-yuketang-font-root')
    expect(root).not.toBeNull()
    expect(root?.textContent).toContain('雨课堂字形解密未开启')
    expect(root?.textContent).toContain('等待用户开启解密')
    expect(root?.textContent).toContain('累计解密：0')
    expect(root?.textContent).toContain('开启解密')
    expect(root?.textContent).toContain('复制明文')
  })

  it('does not start the userscript runtime or render the status panel inside iframes', async () => {
    const parentWindow = {} as Window
    const fetchMock = vi.mocked(fetch)
    vi.spyOn(window, 'top', 'get').mockReturnValue(parentWindow)

    await import('../src/main.tsx')
    await vi.advanceTimersByTimeAsync(500)

    expect(document.body.querySelector('#fuck-yuketang-font-root')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
