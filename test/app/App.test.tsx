import type { DecryptStatus } from '../../src/runtime/statusBus'
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'

import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/app/App'
import { CONTROL_EVENT, STATUS_EVENT } from '../../src/runtime/statusBus'

afterEach(cleanup)

describe('app', () => {
  it('shows the initial userscript status', () => {
    render(() => <App />)

    expect(screen.getByText('雨课堂字形解密未开启')).toBeTruthy()
    expect(screen.getByText('等待用户开启解密')).toBeTruthy()
    expect(screen.getByText('累计解密：0')).toBeTruthy()
    expect(screen.getByRole('button', { name: '开启解密' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '复制明文' })).toHaveProperty('disabled', true)
  })

  it('updates when the decryptor emits status events', async () => {
    render(() => <App />)

    window.dispatchEvent(
      new CustomEvent<DecryptStatus>(STATUS_EVENT, {
        detail: { message: '已解密 3 段文本', decryptedCount: 3 },
      }),
    )

    expect(await screen.findByText('已解密 3 段文本')).toBeTruthy()
    expect(screen.getByText('累计解密：3')).toBeTruthy()
  })

  it('dispatches decryption control events from the toggle button', () => {
    const controls: boolean[] = []
    window.addEventListener(CONTROL_EVENT, event => controls.push((event as CustomEvent<{ enabled: boolean }>).detail.enabled))
    render(() => <App />)

    fireEvent.click(screen.getByRole('button', { name: '开启解密' }))
    fireEvent.click(screen.getByRole('button', { name: '暂停解密' }))

    expect(controls).toEqual([true, false])
  })

  it('copies decrypted text from the latest status', async () => {
    const writeText = vi.fn<() => Promise<void>>(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })
    render(() => <App />)

    window.dispatchEvent(
      new CustomEvent<DecryptStatus>(STATUS_EVENT, {
        detail: { enabled: true, message: '已解密 2 段文本', decryptedCount: 2, decryptedTexts: ['第一段', '第二段'] },
      }),
    )

    await fireEvent.click(await screen.findByRole('button', { name: '复制明文' }))

    expect(writeText).toHaveBeenCalledWith('第一段\n第二段')
  })
})
