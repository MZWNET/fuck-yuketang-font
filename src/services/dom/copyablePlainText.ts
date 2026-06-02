import { ROOT_ID } from '../../constants/userscript'

const BLOCK_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DD',
  'DIV',
  'DL',
  'DT',
  'FIELDSET',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'TBODY',
  'TD',
  'TFOOT',
  'TH',
  'THEAD',
  'TR',
  'UL',
])

const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'])
const PANEL_ATTRIBUTE = 'data-fuck-yuketang-font-panel'
const EXERCISE_END_LINES = new Set(['上一题', '已提交', '下一题', '批注'])

export function extractCopyablePlainText(root: ParentNode = document.body): string {
  const rawText = collectText(root)
  const lines = rawText
    .split('\n')
    .map(line => normalizeInlineWhitespace(line))
    .filter(line => line.length > 0)
  const exerciseLines = extractExerciseLines(lines)

  return formatExerciseLines(exerciseLines).join('\n')
}

function collectText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE)
    return node.textContent ?? ''

  if (!(node instanceof Element || node instanceof Document || node instanceof DocumentFragment))
    return ''

  if (node instanceof Element) {
    if (node.id === ROOT_ID || node.hasAttribute(PANEL_ATTRIBUTE) || SKIPPED_TAGS.has(node.tagName))
      return ''

    if (node.tagName === 'BR')
      return '\n'
  }

  const childText = Array.from(node.childNodes).map(collectText).join('')
  if (!(node instanceof Element) || !BLOCK_TAGS.has(node.tagName))
    return childText

  return `\n${childText}\n`
}

function normalizeInlineWhitespace(text: string): string {
  return text.replace(/[ \t\f\v\u00A0]+/g, ' ').trim()
}

function extractExerciseLines(lines: string[]): string[] {
  const startIndex = lines.findIndex(isQuestionHeadingLine)
  if (startIndex === -1)
    return lines

  const endIndex = lines.findIndex((line, index) => index > startIndex && isExerciseEndLine(line))
  if (endIndex === -1)
    return lines.slice(startIndex)

  return lines.slice(startIndex, endIndex)
}

function isQuestionHeadingLine(line: string): boolean {
  return /^\d+\..*题$/.test(line)
}

function isExerciseEndLine(line: string): boolean {
  return line.startsWith('本题得分：') || line.startsWith('正确答案：') || EXERCISE_END_LINES.has(line)
}

function formatExerciseLines(lines: string[]): string[] {
  const formatted: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const nextLine = lines[index + 1]
    const heading = /^(\d+)\.(.*题)$/.exec(line)
    if (heading !== null) {
      const questionNumber = heading[1] ?? ''
      const questionType = (heading[2] ?? '').trim()
      if (nextLine !== undefined && /^\(.+分\)$/.test(nextLine)) {
        formatted.push(`${questionNumber}. ${questionType} ${nextLine}`)
        index += 1
      }
      else {
        formatted.push(`${questionNumber}. ${questionType}`)
      }
      continue
    }

    if (/^[A-Z]$/.test(line) && nextLine !== undefined) {
      formatted.push(`${line}. ${nextLine}`)
      index += 1
      continue
    }

    formatted.push(line)
  }

  return formatted
}
