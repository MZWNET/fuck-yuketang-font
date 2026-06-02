import type { DecryptionMap, Font, StructuralGlyph } from './types'

import { parse } from 'opentype.js'
import { glyphCommands } from './glyphCommands'
import { glyphCommandHash } from './glyphHash'
import { GLYPH_HASH_TO_UNICODE } from './glyphMapping'

export async function decryptFont(arrayBuffer: ArrayBuffer): Promise<DecryptionMap> {
  const font = parseFont(arrayBuffer)
  if (font === null)
    return new Map()
  const result = new Map<number, number>()

  for (let glyphId = 0; glyphId < font.numGlyphs; glyphId += 1) {
    const glyph = font.glyphs.get(glyphId) as StructuralGlyph

    const sourceCode = glyph.unicodes[0]
    if (sourceCode === undefined)
      continue

    const commands = glyphCommands(glyph, font)
    if (commands.length === 0)
      continue

    const hash = glyphCommandHash(commands)
    const unicode = GLYPH_HASH_TO_UNICODE[hash as keyof typeof GLYPH_HASH_TO_UNICODE]
    if (unicode !== undefined)
      result.set(sourceCode, unicode)
  }

  return result
}

function parseFont(arrayBuffer: ArrayBuffer): Font | null {
  try {
    return parse(arrayBuffer)
  }
  catch (error) {
    if (isUnsupportedCmapError(String((error as Error).message)))
      return null
    throw error
  }
}

function isUnsupportedCmapError(message: string): boolean {
  return message === 'No valid cmap sub-tables found.'
    || message.startsWith('Only format 0 (platformId 1, encodingId 0), 4, 12 and 14 cmap tables are supported')
}
