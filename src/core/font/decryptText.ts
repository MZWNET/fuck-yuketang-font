import type { DecryptionMap } from './types'

const CJK_RADICAL_START = 0x2E80
const CJK_RADICAL_END = 0x2FDF

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
      output += decryptedCharacter(decrypted)
    }
  }

  return changed ? collapseWhitespace(output) : text
}

function decryptedCharacter(codePoint: number): string {
  const char = String.fromCodePoint(codePoint)
  if (codePoint >= CJK_RADICAL_START && codePoint <= CJK_RADICAL_END)
    return char.normalize('NFKC')
  return char
}

function collapseWhitespace(value: string): string {
  return value.replace(/[\n\r]/g, ' ').trim().replace(/\s+/g, ' ')
}
