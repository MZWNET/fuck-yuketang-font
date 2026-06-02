import type { DecryptionMap } from './types'

export function decryptText(text: string, decryptionMap: DecryptionMap): string {
  let changed = false
  let output = ''

  for (const char of text) {
    const codePoint = char.codePointAt(0)!
    const decrypted = decryptionMap.get(codePoint)
    if (decrypted === undefined) {
      output += char
    }
    else {
      changed = true
      output += String.fromCodePoint(decrypted)
    }
  }

  return changed ? collapseWhitespace(output) : text
}

function collapseWhitespace(value: string): string {
  return value.replace(/[\n\r]/g, ' ').trim().replace(/\s+/g, ' ')
}
