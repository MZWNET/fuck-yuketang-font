import type { DecryptionMap } from '../core/font'

export interface FontState {
  url: string
  promise: Promise<DecryptionMap>
}

export interface RuntimeState {
  currentUrl: string
  decryptedCount: number
  decryptedTexts: string[]
  decryptionEnabled: boolean
  decryptingNodes: WeakSet<Element>
  disposed: boolean
  fontState?: FontState
}

export interface UserscriptRuntime {
  scanAndDecrypt: () => void
  dispose: () => void
}
