import { describe, expect, it } from 'vitest'
import {
  containsEncryptedTextElement,
  findEncryptedTextNodes,
  isEncryptedTextElement,
  markElementDecrypted,
} from '../../../src/services/dom/encryptedTextNodes'

describe('encrypted text DOM helpers', () => {
  it('finds, identifies, and clears encrypted text elements', () => {
    document.body.replaceChildren()
    const wrapper = document.createElement('div')
    const encrypted = document.createElement('span')
    encrypted.className = 'xuetangx-com-encrypted-font'
    wrapper.append(encrypted)
    document.body.append(wrapper)

    expect(findEncryptedTextNodes()).toEqual([encrypted])
    expect(isEncryptedTextElement(encrypted)).toBe(true)
    expect(containsEncryptedTextElement(wrapper)).toBe(true)

    markElementDecrypted(encrypted)

    expect(isEncryptedTextElement(encrypted)).toBe(false)
    expect(findEncryptedTextNodes()).toEqual([])
  })
})
