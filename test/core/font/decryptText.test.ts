import { describe, expect, it } from 'vitest'
import { decryptText } from '../../../src/core/font'

describe('decryptText', () => {
  it('returns the original string value when no code points are mapped', () => {
    expect(decryptText('  unchanged\n text  ', new Map([[0xE001, 0x4F60]]))).toBe('  unchanged\n text  ')
  })

  it('replaces BMP private-use and supplementary code points', () => {
    const map = new Map([
      [0xE001, 0x4F60],
      [0x1F600, 0x597D],
    ])

    expect(decryptText('甲\uE001😀乙', map)).toBe('甲你好乙')
  })

  it('collapses whitespace only after at least one replacement', () => {
    expect(decryptText('  a\n\t\uE001   b\r\n', new Map([[0xE001, 0x4F60]]))).toBe('a 你 b')
    expect(decryptText('  a\n\t b\r\n', new Map())).toBe('  a\n\t b\r\n')
  })
})
