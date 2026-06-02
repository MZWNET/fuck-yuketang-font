import { ENCRYPTED_FONT_CLASS } from '../../constants/userscript'

export function findEncryptedTextNodes(root: ParentNode = document): Element[] {
  return Array.from(root.querySelectorAll(`.${ENCRYPTED_FONT_CLASS}`))
}

export function isEncryptedTextElement(element: Element): boolean {
  return element.classList.contains(ENCRYPTED_FONT_CLASS)
}

export function containsEncryptedTextElement(element: Element): boolean {
  return element.querySelector(`.${ENCRYPTED_FONT_CLASS}`) !== null
}

export function markElementDecrypted(element: Element): void {
  element.classList.remove(ENCRYPTED_FONT_CLASS)
}
