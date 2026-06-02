import type { StatusBus } from './statusBus'
import type { FontState, RuntimeState } from './types'

import { decryptText } from '../core/font'
import { markElementDecrypted } from '../services/dom/encryptedTextNodes'

export interface NodeDecryptorOptions {
  state: RuntimeState
  statusBus: StatusBus
  scanAndDecrypt: () => void
}

export async function decryptNode(span: Element, fontState: FontState, options: NodeDecryptorOptions): Promise<void> {
  const { state, statusBus, scanAndDecrypt } = options

  try {
    const map = await fontState.promise
    if (state.disposed)
      return
    if (!state.decryptionEnabled) {
      state.decryptingNodes.delete(span)
      return
    }
    if (state.fontState?.url !== fontState.url) {
      state.decryptingNodes.delete(span)
      scanAndDecrypt()
      return
    }

    const decrypted = decryptText(span.textContent ?? '', map)
    span.textContent = decrypted
    markElementDecrypted(span)
    state.decryptedCount += 1
    state.decryptedTexts.push(decrypted)
    statusBus.emit(`已解密 ${state.decryptedCount} 段文本`, state.decryptedCount, {
      decryptedTexts: [...state.decryptedTexts],
      enabled: state.decryptionEnabled,
    })
  }
  catch (error) {
    console.error('雨课堂字形解密失败', error)
    statusBus.emit('解密失败，等待页面或字体刷新后重试', state.decryptedCount)
    state.decryptingNodes.delete(span)
  }
}
