import type { Component } from 'solid-js'
import type { DecryptStatus } from '../../runtime/statusBus'

import { createSignal, onCleanup, onMount } from 'solid-js'
import { CONTROL_EVENT, STATUS_EVENT } from '../../runtime/statusBus'
import { extractCopyablePlainText } from '../../services/dom/copyablePlainText'
import styles from './StatusPanel.module.css'

const INITIAL_STATUS: DecryptStatus = {
  decryptedTexts: [],
  enabled: false,
  message: '等待用户开启解密',
  decryptedCount: 0,
}

const classes = styles as {
  action: string
  actions: string
  counter: string
  description: string
  panel: string
  secondaryAction: string
  title: string
}

export const StatusPanel: Component = () => {
  const [status, setStatus] = createSignal<DecryptStatus>(INITIAL_STATUS)

  onMount(() => {
    const handleStatus = (event: Event) => {
      setStatus(current => ({ ...current, ...(event as CustomEvent<DecryptStatus>).detail }))
    }

    window.addEventListener(STATUS_EVENT, handleStatus)
    onCleanup(() => window.removeEventListener(STATUS_EVENT, handleStatus))
  })

  const setEnabled = (enabled: boolean) => {
    setStatus(current => ({
      ...current,
      enabled,
      message: enabled ? '解密已开启，正在扫描页面文本' : '解密已暂停',
    }))
    window.dispatchEvent(new CustomEvent(CONTROL_EVENT, { detail: { enabled } }))
  }

  const copyDecryptedText = async () => {
    const text = extractCopyablePlainText() || status().decryptedTexts?.join('\n') || ''
    if (text === '')
      return
    await navigator.clipboard?.writeText(text)
  }

  return (
    <aside class={classes.panel} data-fuck-yuketang-font-panel="" aria-live="polite">
      <div class={classes.title}>{status().enabled ? '雨课堂字形解密已开启' : '雨课堂字形解密未开启'}</div>
      <div class={classes.description}>{status().message}</div>
      <div class={classes.counter}>
        累计解密：
        {status().decryptedCount}
      </div>
      <div class={classes.actions}>
        <button class={classes.action} type="button" onClick={() => setEnabled(!status().enabled)}>
          {status().enabled ? '暂停解密' : '开启解密'}
        </button>
        <button
          class={`${classes.action} ${classes.secondaryAction}`}
          disabled={(status().decryptedTexts?.length ?? 0) === 0}
          type="button"
          onClick={copyDecryptedText}
        >
          复制明文
        </button>
      </div>
    </aside>
  )
}
