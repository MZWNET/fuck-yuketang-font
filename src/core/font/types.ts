import type { Font, Glyph } from 'opentype.js'

export interface OpenTypePoint { x: number, y: number }
interface OpenTypeComponent { glyphIndex: number, dx: number, dy: number }

export interface StructuralGlyph extends Glyph {
  endPointIndices?: number[]
  points?: OpenTypePoint[]
  isComposite?: boolean
  components?: OpenTypeComponent[]
}

export type { Font, Glyph }
export type DecryptionMap = Map<number, number>
