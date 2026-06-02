import type { RuntimeState } from './types'

export function createRuntimeState(initialUrl: string = location.href): RuntimeState {
  return {
    currentUrl: initialUrl,
    decryptedCount: 0,
    decryptedTexts: [],
    decryptionEnabled: false,
    decryptingNodes: new WeakSet<Element>(),
    disposed: false,
  }
}
