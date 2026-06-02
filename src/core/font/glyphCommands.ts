import type { Font, Glyph, OpenTypePoint, StructuralGlyph } from './types'

export function glyphCommands(glyph: StructuralGlyph, font: Font): string[] {
  forceGlyphParsed(glyph)

  if (glyph.isComposite === true) {
    const components = glyph.components!
    if (components.length === 0)
      return []

    return [
      'COMPOSITE',
      ...components.map(component => `${componentGlyphName(font, component.glyphIndex)}(${component.dx},${component.dy})`),
    ]
  }

  const points = glyph.points
  if (points === undefined || points.length === 0)
    return []

  const endPointIndices = glyph.endPointIndices!

  return [
    `CONTOUR_END:${pythonList(endPointIndices)}`,
    `COORDS:${glyphCoordinatesRepr(points)}`,
  ]
}

function forceGlyphParsed(glyph: Glyph): void {
  void glyph.path
}

function componentGlyphName(font: Font, glyphId: number): string {
  const glyph = font.glyphs.get(glyphId) as Glyph | undefined
  const name = glyph?.name
  return name === undefined || name === null || name === '' ? fallbackGlyphName(glyphId) : name
}

function pythonList(values: readonly number[]): string {
  return `[${values.join(', ')}]`
}

function glyphCoordinatesRepr(coordinates: readonly OpenTypePoint[]): string {
  return `GlyphCoordinates([${coordinates.map(({ x, y }) => `(${x}, ${y})`).join(',')}])`
}

function fallbackGlyphName(glyphId: number): string {
  return `.glyph${glyphId}`
}
