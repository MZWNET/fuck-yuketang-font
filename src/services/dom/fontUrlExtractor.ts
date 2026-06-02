import { FONT_URL_PATTERN } from '../../constants/userscript'

export function extractFontUrl(): string | undefined {
  const styleTags = Array.from(document.querySelectorAll('style'))
  for (let i = styleTags.length - 1; i >= 0; i -= 1) {
    const styleTag = styleTags[i]!
    const match = FONT_URL_PATTERN.exec(styleTag.textContent ?? '')
    if (match?.[1] !== undefined)
      return match[1]
  }

  const sheets = Array.from(document.styleSheets)
  for (let i = sheets.length - 1; i >= 0; i -= 1) {
    let rules: CSSRuleList
    try {
      const sheet = sheets[i]!
      rules = sheet.cssRules
    }
    catch {
      continue
    }

    const ruleList = Array.from(rules)
    for (let j = ruleList.length - 1; j >= 0; j -= 1) {
      const rule = ruleList[j]!
      const match = FONT_URL_PATTERN.exec(rule.cssText)
      if (match?.[1] !== undefined)
        return match[1]
    }
  }

  return undefined
}

export function extractFontUrlFromStyleElement(style: HTMLStyleElement): string | undefined {
  return FONT_URL_PATTERN.exec(style.textContent ?? '')?.[1]
}
