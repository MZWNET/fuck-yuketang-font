import type { DecryptStatus } from '../../src/runtime/statusBus'
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'

import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/app/App'
import { CONTROL_EVENT, STATUS_EVENT } from '../../src/runtime/statusBus'

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
})

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
    document.body.innerHTML = `
      <section>
        <div>1.单选题</div>
        <div>(1分)</div>
        <p>在教材推荐的字符串处理⽅式中,优先选择()。</p>
        <div>A</div><div>C⻛格字符数组</div>
        <div>B</div><div>string类</div>
        <div>C</div><div>字符指针常量</div>
        <div>D</div><div>⼿⼯逐字符拼接</div>
      </section>
    `
    render(() => <App />)

    window.dispatchEvent(
      new CustomEvent<DecryptStatus>(STATUS_EVENT, {
        detail: { enabled: true, message: '已解密 2 段文本', decryptedCount: 2, decryptedTexts: ['第一段', '第二段'] },
      }),
    )

    await fireEvent.click(await screen.findByRole('button', { name: '复制明文' }))

    expect(writeText).toHaveBeenCalledWith([
      '1. 单选题 (1分)',
      '在教材推荐的字符串处理⽅式中,优先选择()。',
      'A. C⻛格字符数组',
      'B. string类',
      'C. 字符指针常量',
      'D. ⼿⼯逐字符拼接',
    ].join('\n'))
  })

  it('falls back to decrypted text fragments when the page has no copyable text', async () => {
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
