import type { DecryptionMap } from '../core/font'
import type { UserscriptRuntime } from './types'

import { decryptFont } from '../core/font'
import { containsEncryptedTextElement, findEncryptedTextNodes, isEncryptedTextElement } from '../services/dom/encryptedTextNodes'
import { extractFontUrlFromStyleElement } from '../services/dom/fontUrlExtractor'
import { requestFont } from '../services/http/requestFont'
import { installPromiseWithResolversFallback } from '../services/platform/promiseWithResolvers'
import { createRuntimeState } from './createRuntimeState'
import { createFontWatcher } from './fontWatcher'
import { decryptNode } from './nodeDecryptor'
import { startRouteWatcher } from './routeWatcher'
import { CONTROL_EVENT, createStatusBus } from './statusBus'

export function createUserscriptRuntime(): UserscriptRuntime {
  installPromiseWithResolversFallback()

  const state = createRuntimeState()
  const statusBus = createStatusBus()
  const emitStatus = (message: string): void => {
    statusBus.emit(message, state.decryptedCount, {
      decryptedTexts: [...state.decryptedTexts],
      enabled: state.decryptionEnabled,
    })
  }

  const loadDecryptionMap = async (url: string): Promise<DecryptionMap> => {
    const fontBytes = await requestFont(url)
    const map = await decryptFont(fontBytes)
    emitStatus(
      state.decryptionEnabled
        ? `字体映射已就绪：${map.size} 个字形`
        : `字体映射已就绪：${map.size} 个字形，等待开启解密`,
    )
    return map
  }

  const setFontUrl = (url: string): void => {
    if (state.fontState?.url === url)
      return
    emitStatus('已捕获加密字体，正在解析映射')
    state.fontState = { url, promise: loadDecryptionMap(url) }
  }

  const scanAndDecrypt = (): void => {
    const fontState = state.fontState
    if (fontState === undefined || state.disposed || !state.decryptionEnabled)
      return

    const spans = findEncryptedTextNodes()
    for (const span of spans) {
      if (state.decryptingNodes.has(span))
        continue
      state.decryptingNodes.add(span)
      void decryptNode(span, fontState, { state, statusBus, scanAndDecrypt })
    }
  }

  const fontWatcher = createFontWatcher(setFontUrl, scanAndDecrypt)

  const handleControl = (event: Event): void => {
    state.decryptionEnabled = (event as CustomEvent<{ enabled: boolean }>).detail.enabled
    emitStatus(state.decryptionEnabled ? '解密已开启，正在扫描页面文本' : '解密已暂停')
    if (state.decryptionEnabled)
      scanAndDecrypt()
  }

  window.addEventListener(CONTROL_EVENT, handleControl)

  const observer = new MutationObserver((mutations) => {
    let shouldScan = false

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element))
          continue

        if (node instanceof HTMLStyleElement) {
          const url = extractFontUrlFromStyleElement(node)
          if (url !== undefined) {
            setFontUrl(url)
            shouldScan = true
          }
        }

        if (isEncryptedTextElement(node) || containsEncryptedTextElement(node))
          shouldScan = true
      }
    }

    if (shouldScan)
      scanAndDecrypt()
  })

  const observeTarget = document.body ?? document.documentElement
  observer.observe(observeTarget, { childList: true, subtree: true })

  const routeTimer = startRouteWatcher((url) => {
    if (url === state.currentUrl)
      return

    state.currentUrl = url
    state.fontState = undefined
    state.decryptingNodes = new WeakSet<Element>()
    state.decryptedCount = 0
    state.decryptedTexts = []
    emitStatus('页面已切换，重新捕获字体')
    fontWatcher.start()
  })

  fontWatcher.start()

  return {
    scanAndDecrypt,
    dispose: () => {
      state.disposed = true
      window.removeEventListener(CONTROL_EVENT, handleControl)
      observer.disconnect()
      fontWatcher.stop()
      window.clearInterval(routeTimer)
    },
  }
}
