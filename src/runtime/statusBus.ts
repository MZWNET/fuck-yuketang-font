export const STATUS_EVENT = 'fuck-yuketang-font:status'
export const CONTROL_EVENT = 'fuck-yuketang-font:control'

export interface DecryptStatus {
  decryptedTexts?: string[]
  message: string
  decryptedCount: number
  enabled?: boolean
}

export interface StatusBus {
  emit: (message: string, decryptedCount: number, status?: Pick<DecryptStatus, 'decryptedTexts' | 'enabled'>) => void
}

export function createStatusBus(target: Window = window): StatusBus {
  return {
    emit: (message, decryptedCount, status = {}) => {
      target.dispatchEvent(
        new CustomEvent<DecryptStatus>(STATUS_EVENT, {
          detail: { message, decryptedCount, ...status },
        }),
      )
    },
  }
}
