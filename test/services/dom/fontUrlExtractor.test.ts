import { describe, expect, it } from 'vitest'
import { extractFontUrl, extractFontUrlFromStyleElement } from '../../../src/services/dom/fontUrlExtractor'

const FONT_URL = 'https://static.yuketang.cn/fe_font/product/exam_font_abc123.ttf'

describe('font url extractor', () => {
  it('prefers the latest matching style tag', () => {
    document.head.replaceChildren()
    document.head.append(styleWithText(`@font-face{src:url(https://static.yuketang.cn/fe_font/product/exam_font_old.ttf)}`))
    document.head.append(styleWithText(`@font-face{src:url(${FONT_URL})}`))

    expect(extractFontUrl()).toBe(FONT_URL)
  })

  it('extracts from a style element and ignores unmatched styles', () => {
    expect(extractFontUrlFromStyleElement(styleWithText(`@font-face{src:url(${FONT_URL})}`))).toBe(FONT_URL)
    expect(extractFontUrlFromStyleElement(styleWithText('@font-face{font-family:test}'))).toBeUndefined()
  })

  it('extracts font urls from stylesheet rules and tolerates inaccessible stylesheets', () => {
    document.head.replaceChildren()
    Object.defineProperty(document, 'styleSheets', {
      configurable: true,
      value: [
        {
          get cssRules(): CSSRuleList {
            throw new DOMException('blocked', 'SecurityError')
          },
        },
        { cssRules: [{ cssText: `@font-face{src:url(${FONT_URL})}` }] },
      ],
    })

    expect(extractFontUrl()).toBe(FONT_URL)
  })

  it('returns undefined when no font url exists or only unmatched urls are present', () => {
    document.head.replaceChildren(styleWithText('@font-face{src:url(https://example.com/not-yuketang.ttf)}'))
    Object.defineProperty(document, 'styleSheets', {
      configurable: true,
      value: [
        {
          get cssRules(): CSSRuleList {
            throw new DOMException('blocked', 'SecurityError')
          },
        },
        { cssRules: [{ cssText: '@font-face{src:url(https://example.com/other.ttf)}' }] },
      ],
    })

    expect(extractFontUrl()).toBeUndefined()

    document.head.replaceChildren()
    Object.defineProperty(document, 'styleSheets', { configurable: true, value: [] })

    expect(extractFontUrl()).toBeUndefined()
  })
})

function styleWithText(text: string): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = text
  return style
}
