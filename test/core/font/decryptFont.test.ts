import { describe, expect, it } from 'vitest'
import { decryptFont } from '../../../src/core/font'

const ARG_1_AND_2_ARE_WORDS = 0x0001
const ARGS_ARE_XY_VALUES = 0x0002
const WE_HAVE_A_SCALE = 0x0008
const MORE_COMPONENTS = 0x0020
const WE_HAVE_AN_X_AND_Y_SCALE = 0x0040
const WE_HAVE_A_TWO_BY_TWO = 0x0080
const WE_HAVE_INSTRUCTIONS = 0x0100

const X_SHORT_VECTOR = 0x02
const Y_SHORT_VECTOR = 0x04
const REPEAT_FLAG = 0x08
const X_IS_SAME_OR_POSITIVE_X_SHORT_VECTOR = 0x10
const Y_IS_SAME_OR_POSITIVE_Y_SHORT_VECTOR = 0x20

describe('decryptFont', () => {
  it('parses short loca fonts, format 4 direct/idRangeOffset cmap segments, and simple glyph coordinate encodings', async () => {
    const font = new TtfBuilder({
      locaFormat: 0,
      glyphs: [
        emptyGlyph(),
        simpleGlyph({
          endPts: [4],
          flags: [
            X_SHORT_VECTOR | X_IS_SAME_OR_POSITIVE_X_SHORT_VECTOR | Y_SHORT_VECTOR | Y_IS_SAME_OR_POSITIVE_Y_SHORT_VECTOR | REPEAT_FLAG,
            X_SHORT_VECTOR | Y_SHORT_VECTOR,
            X_IS_SAME_OR_POSITIVE_X_SHORT_VECTOR,
          ],
          repeatCounts: new Map([[0, 2]]),
          xBytes: [10, 3, 0xFF, 0xFE, 4],
          yBytes: [5, 7, 0x00, 0x09, 2],
        }),
        simpleGlyph({ endPts: [0], flags: [X_IS_SAME_OR_POSITIVE_X_SHORT_VECTOR | Y_IS_SAME_OR_POSITIVE_Y_SHORT_VECTOR] }),
        simpleGlyph({ endPts: [0], flags: [X_SHORT_VECTOR | Y_SHORT_VECTOR], xBytes: [9], yBytes: [8] }),
      ],
      cmap: cmapTable([
        cmapRecord(3, 1, format4Cmap([
          { start: 1, end: 1, idDelta: 0 },
          { start: 0xE001, end: 0xE003, idDelta: 0, glyphIds: [1, 0, 3] },
        ])),
      ]),
    }).arrayBuffer()

    await expect(decryptFont(font)).resolves.toEqual(new Map())
  })

  it('parses long loca fonts, chooses format 12 over lower-scored cmaps, and reads composite glyph variants', async () => {
    const font = new TtfBuilder({
      locaFormat: 1,
      glyphs: [
        emptyGlyph(),
        simpleGlyph({ endPts: [0], flags: [X_SHORT_VECTOR | Y_SHORT_VECTOR], xBytes: [1], yBytes: [1] }),
        compositeGlyph([
          component(MORE_COMPONENTS | ARGS_ARE_XY_VALUES, 1, 7, -3),
          component(MORE_COMPONENTS | ARG_1_AND_2_ARE_WORDS | ARGS_ARE_XY_VALUES | WE_HAVE_A_SCALE, 1, 300, -301, [0x40, 0x00]),
          component(MORE_COMPONENTS | ARG_1_AND_2_ARE_WORDS | WE_HAVE_AN_X_AND_Y_SCALE, 1, 0, 0, [0x40, 0x00, 0x20, 0x00]),
          component(ARG_1_AND_2_ARE_WORDS | ARGS_ARE_XY_VALUES | WE_HAVE_A_TWO_BY_TWO | WE_HAVE_INSTRUCTIONS, 1, -12, 34, [0x40, 0x00, 0, 0, 0, 0, 0x40, 0x00]),
        ], [1, 2, 3]),
      ],
      cmap: cmapTable([
        cmapRecord(3, 1, format4Cmap([{ start: 0x0041, end: 0x0041, idDelta: 1 - 0x0041 }])),
        cmapRecord(3, 10, format12Cmap([{ start: 0x1F600, end: 0x1F600, glyphStart: 2 }])),
      ]),
      post: postFormat2([36, 258, 36], ['quoted"slash\\\n\r\t\b\f\u0001']),
    }).arrayBuffer()

    await expect(decryptFont(font)).resolves.toEqual(new Map())
  })

  it('falls back for unsupported post tables and package-missing glyph names', async () => {
    const unsupportedPost = new TtfBuilder({
      glyphs: [emptyGlyph(), compositeGlyph([component(ARGS_ARE_XY_VALUES, 1, 0, 0)])],
      cmap: cmapTable([cmapRecord(1, 0, format12Cmap([{ start: 0xE101, end: 0xE101, glyphStart: 1 }]))]),
      post: postFormat3(),
    }).arrayBuffer()
    const missingPackageName = new TtfBuilder({
      glyphs: [emptyGlyph(), compositeGlyph([component(ARGS_ARE_XY_VALUES, 1, 0, 0)])],
      cmap: cmapTable([cmapRecord(3, 10, format12Cmap([{ start: 0xE102, end: 0xE102, glyphStart: 1 }]))]),
      post: postFormat3(),
    }).arrayBuffer()

    await expect(decryptFont(unsupportedPost)).resolves.toEqual(new Map())
    await expect(decryptFont(missingPackageName)).resolves.toEqual(new Map())
  })

  it('returns an empty map for unsupported or absent usable cmap subtables', async () => {
    const unsupported = new TtfBuilder({
      glyphs: [emptyGlyph(), simpleGlyph({ endPts: [0], flags: [X_SHORT_VECTOR | Y_SHORT_VECTOR], xBytes: [1], yBytes: [1] })],
      cmap: cmapTable([cmapRecord(3, 1, unsupportedCmap())]),
    }).arrayBuffer()
    const noRecords = new TtfBuilder({
      glyphs: [emptyGlyph()],
      cmap: cmapTable([]),
    }).arrayBuffer()

    await expect(decryptFont(unsupported)).resolves.toEqual(new Map())
    await expect(decryptFont(noRecords)).resolves.toEqual(new Map())
  })

  it('covers empty glyph locations, empty command glyphs, low-score cmaps, and truncated post names', async () => {
    const font = new TtfBuilder({
      glyphs: [
        emptyGlyph(),
        emptyGlyph(),
        simpleGlyph({ endPts: [], flags: [] }),
        simpleGlyph({ endPts: [0], flags: [0], xBytes: [0x00, 0x11], yBytes: [0xFF, 0xF0] }),
        compositeGlyph([component(ARGS_ARE_XY_VALUES, 3, 0, 0)]),
        simpleGlyph({ endPts: [0], flags: [Y_IS_SAME_OR_POSITIVE_Y_SHORT_VECTOR], xBytes: [0x00, 0x05] }),
      ],
      cmap: cmapTable([
        cmapRecord(2, 0, format4Cmap([{ start: 0xE300, end: 0xE300, idDelta: 1 - 0xE300 }])),
        cmapRecord(0, 3, format4Cmap([{ start: 0xE301, end: 0xE305, idDelta: 0, glyphIds: [1, 2, 3, 4, 5] }])),
      ]),
      post: postFormat2([36], []),
    }).arrayBuffer()

    await expect(decryptFont(font)).resolves.toEqual(new Map())
  })

  it('throws for missing required tables and invalid glyph locations', async () => {
    const valid = new TtfBuilder({ glyphs: [emptyGlyph()], cmap: cmapTable([]) }).arrayBuffer()
    const withoutMaxp = new TtfBuilder({
      glyphs: [emptyGlyph(), simpleGlyph({ endPts: [0], flags: [X_SHORT_VECTOR | Y_SHORT_VECTOR], xBytes: [1], yBytes: [1] })],
      cmap: cmapTable([cmapRecord(3, 1, format4Cmap([{ start: 0xE201, end: 0xE201, idDelta: 1 - 0xE201 }]))]),
      omitTables: new Set(['maxp']),
    }).arrayBuffer()
    const invalidLoca = new TtfBuilder({
      locaFormat: 1,
      glyphs: [emptyGlyph(), simpleGlyph({ endPts: [0], flags: [X_SHORT_VECTOR | Y_SHORT_VECTOR], xBytes: [1], yBytes: [1] })],
      cmap: cmapTable([cmapRecord(3, 10, format12Cmap([{ start: 0xE200, end: 0xE200, glyphStart: 2 }]))]),
      numGlyphs: 1000,
    }).arrayBuffer()

    await expect(decryptFont(withoutMaxp)).rejects.toThrow()
    await expect(decryptFont(invalidLoca)).rejects.toThrow()
    await expect(decryptFont(valid)).resolves.toEqual(new Map())
  })
})

interface TtfOptions {
  glyphs: Uint8Array[]
  cmap: Uint8Array
  locaFormat?: 0 | 1
  post?: Uint8Array
  omitTables?: Set<string>
  numGlyphs?: number
}

class TtfBuilder {
  private readonly options: TtfOptions

  constructor(options: TtfOptions) {
    this.options = options
  }

  arrayBuffer(): ArrayBuffer {
    const locaFormat = this.options.locaFormat ?? 0
    const glyfBytes = new Bytes()
    const offsets: number[] = []
    for (const glyph of this.options.glyphs) {
      offsets.push(glyfBytes.length)
      glyfBytes.pushBytes(glyph)
      glyfBytes.align(2)
    }
    offsets.push(glyfBytes.length)

    const glyphCount = this.options.numGlyphs ?? this.options.glyphs.length
    const tables = new Map<string, Uint8Array>([
      ['maxp', maxpTable(glyphCount)],
      ['head', headTable(locaFormat)],
      ['hhea', hheaTable(glyphCount)],
      ['hmtx', hmtxTable(glyphCount)],
      ['name', nameTable()],
      ['loca', locaTable(offsets, locaFormat)],
      ['glyf', glyfBytes.toUint8Array()],
      ['cmap', this.options.cmap],
    ])
    tables.set('post', this.options.post ?? postFormat3())
    for (const tag of this.options.omitTables ?? []) tables.delete(tag)

    return fontFile(tables)
  }
}

class Bytes {
  private readonly data: number[] = []

  get length(): number {
    return this.data.length
  }

  u8(value: number): void {
    this.data.push(value & 0xFF)
  }

  i8(value: number): void {
    this.u8(value)
  }

  u16(value: number): void {
    this.data.push((value >>> 8) & 0xFF, value & 0xFF)
  }

  i16(value: number): void {
    this.u16(value)
  }

  u32(value: number): void {
    this.data.push((value >>> 24) & 0xFF, (value >>> 16) & 0xFF, (value >>> 8) & 0xFF, value & 0xFF)
  }

  bytes(values: readonly number[]): void {
    for (const value of values) this.u8(value)
  }

  pushBytes(values: Uint8Array): void {
    for (const value of values) this.u8(value)
  }

  ascii(value: string): void {
    for (let i = 0; i < value.length; i += 1) this.u8(value.charCodeAt(i))
  }

  patchAscii(offset: number, value: string): void {
    for (let i = 0; i < value.length; i += 1) {
      this.data[offset + i] = value.charCodeAt(i)
    }
  }

  patchU16(offset: number, value: number): void {
    this.data[offset] = (value >>> 8) & 0xFF
    this.data[offset + 1] = value & 0xFF
  }

  patchU32(offset: number, value: number): void {
    this.data[offset] = (value >>> 24) & 0xFF
    this.data[offset + 1] = (value >>> 16) & 0xFF
    this.data[offset + 2] = (value >>> 8) & 0xFF
    this.data[offset + 3] = value & 0xFF
  }

  align(size: number): void {
    while (this.data.length % size !== 0) this.u8(0)
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.data)
  }
}

function fontFile(tables: Map<string, Uint8Array>): ArrayBuffer {
  const bytes = new Bytes()
  bytes.u32(0x00010000)
  bytes.u16(tables.size)
  bytes.u16(0)
  bytes.u16(0)
  bytes.u16(0)

  const directoryOffset = bytes.length
  for (let i = 0; i < tables.size; i += 1) {
    bytes.u32(0)
    bytes.u32(0)
    bytes.u32(0)
    bytes.u32(0)
  }

  let record = directoryOffset
  for (const [tag, table] of tables) {
    bytes.align(4)
    const offset = bytes.length
    bytes.pushBytes(table)
    bytes.align(4)

    bytes.patchAscii(record, tag)
    bytes.patchU32(record + 4, 0)
    bytes.patchU32(record + 8, offset)
    bytes.patchU32(record + 12, table.length)
    record += 16
  }

  return exactArrayBuffer(bytes.toUint8Array())
}

function exactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const output = new ArrayBuffer(bytes.length)
  new Uint8Array(output).set(bytes)
  return output
}

function maxpTable(numGlyphs: number): Uint8Array {
  const bytes = new Bytes()
  bytes.u32(0x00010000)
  bytes.u16(numGlyphs)
  return bytes.toUint8Array()
}

function headTable(locaFormat: 0 | 1): Uint8Array {
  const bytes = new Bytes()
  bytes.u32(0x00010000)
  bytes.u32(0)
  bytes.u32(0)
  bytes.u32(0x5F0F3CF5)
  bytes.u16(0)
  bytes.u16(1000)
  bytes.u32(0)
  bytes.u32(0)
  bytes.u32(0)
  bytes.u32(0)
  writeBounds(bytes)
  bytes.u16(0)
  bytes.u16(0)
  bytes.i16(2)
  bytes.i16(locaFormat)
  bytes.i16(0)
  return bytes.toUint8Array()
}

function hheaTable(numberOfHMetrics: number): Uint8Array {
  const bytes = new Bytes()
  bytes.u32(0x00010000)
  bytes.i16(0)
  bytes.i16(0)
  bytes.i16(0)
  bytes.u16(1000)
  bytes.i16(0)
  bytes.i16(0)
  bytes.i16(0)
  bytes.i16(1)
  bytes.i16(0)
  bytes.i16(0)
  bytes.i16(0)
  bytes.i16(0)
  bytes.i16(0)
  bytes.i16(0)
  bytes.i16(0)
  bytes.u16(numberOfHMetrics)
  return bytes.toUint8Array()
}

function hmtxTable(numGlyphs: number): Uint8Array {
  const bytes = new Bytes()
  for (let i = 0; i < numGlyphs; i += 1) {
    bytes.u16(1000)
    bytes.i16(0)
  }
  return bytes.toUint8Array()
}

function nameTable(): Uint8Array {
  const bytes = new Bytes()
  bytes.u16(0)
  bytes.u16(0)
  bytes.u16(6)
  return bytes.toUint8Array()
}

function locaTable(offsets: number[], format: 0 | 1): Uint8Array {
  const bytes = new Bytes()
  for (const offset of offsets) {
    if (format === 0)
      bytes.u16(offset / 2)
    else bytes.u32(offset)
  }
  return bytes.toUint8Array()
}

interface SimpleGlyphOptions {
  endPts: number[]
  flags: number[]
  repeatCounts?: Map<number, number>
  xBytes?: number[]
  yBytes?: number[]
}

function simpleGlyph(options: SimpleGlyphOptions): Uint8Array {
  const bytes = new Bytes()
  bytes.i16(options.endPts.length)
  writeBounds(bytes)
  for (const endPoint of options.endPts) bytes.u16(endPoint)
  bytes.u16(0)
  for (let i = 0; i < options.flags.length; i += 1) {
    const flag = options.flags[i]
    if (flag === undefined)
      throw new Error('test glyph flag is missing')
    bytes.u8(flag)
    const repeatCount = options.repeatCounts?.get(i)
    if (repeatCount !== undefined)
      bytes.u8(repeatCount)
  }
  bytes.bytes(options.xBytes ?? [])
  bytes.bytes(options.yBytes ?? [])
  return bytes.toUint8Array()
}

function compositeGlyph(components: Uint8Array[], instructions: readonly number[] = []): Uint8Array {
  const bytes = new Bytes()
  bytes.i16(-1)
  writeBounds(bytes)
  for (const bytesForComponent of components) bytes.pushBytes(bytesForComponent)
  if (instructions.length > 0) {
    bytes.u16(instructions.length)
    bytes.bytes(instructions)
  }
  return bytes.toUint8Array()
}

function component(flags: number, glyphId: number, arg1: number, arg2: number, extra: readonly number[] = []): Uint8Array {
  const bytes = new Bytes()
  bytes.u16(flags)
  bytes.u16(glyphId)
  if ((flags & ARG_1_AND_2_ARE_WORDS) !== 0) {
    bytes.i16(arg1)
    bytes.i16(arg2)
  }
  else {
    bytes.i8(arg1)
    bytes.i8(arg2)
  }
  bytes.bytes(extra)
  return bytes.toUint8Array()
}

function emptyGlyph(): Uint8Array {
  return new Uint8Array()
}

function writeBounds(bytes: Bytes): void {
  bytes.i16(0)
  bytes.i16(0)
  bytes.i16(0)
  bytes.i16(0)
}

interface CmapRecord {
  platformId: number
  encodingId: number
  table: Uint8Array
}

function cmapRecord(platformId: number, encodingId: number, table: Uint8Array): CmapRecord {
  return { platformId, encodingId, table }
}

function cmapTable(records: CmapRecord[]): Uint8Array {
  const bytes = new Bytes()
  bytes.u16(0)
  bytes.u16(records.length)
  const tableStart = 4 + records.length * 8
  let subtableOffset = tableStart
  for (const record of records) {
    bytes.u16(record.platformId)
    bytes.u16(record.encodingId)
    bytes.u32(subtableOffset)
    subtableOffset += record.table.length
  }
  for (const record of records) bytes.pushBytes(record.table)
  return bytes.toUint8Array()
}

interface Format4Segment {
  start: number
  end: number
  idDelta: number
  glyphIds?: number[]
}

function format4Cmap(inputSegments: Format4Segment[]): Uint8Array {
  const segments = [...inputSegments, { start: 0xFFFF, end: 0xFFFF, idDelta: 1 }]
  const glyphIdCount = segments.reduce((count, segment) => count + (segment.glyphIds?.length ?? 0), 0)
  const length = 16 + segments.length * 8 + glyphIdCount * 2
  const bytes = new Bytes()
  bytes.u16(4)
  bytes.u16(length)
  bytes.u16(0)
  bytes.u16(segments.length * 2)
  bytes.u16(0)
  bytes.u16(0)
  bytes.u16(0)
  for (const segment of segments) bytes.u16(segment.end)
  bytes.u16(0)
  for (const segment of segments) bytes.u16(segment.start)
  for (const segment of segments) bytes.i16(segment.idDelta)

  const idRangeOffsetPosition = bytes.length
  let glyphArrayCursor = idRangeOffsetPosition + segments.length * 2
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i]
    if (segment === undefined)
      throw new Error('test cmap segment is missing')
    const glyphIds = segment.glyphIds
    if (glyphIds === undefined) {
      bytes.u16(0)
    }
    else {
      bytes.u16(glyphArrayCursor - (idRangeOffsetPosition + i * 2))
      glyphArrayCursor += glyphIds.length * 2
    }
  }
  for (const segment of segments) {
    for (const glyphId of segment.glyphIds ?? []) bytes.u16(glyphId)
  }
  return bytes.toUint8Array()
}

interface Format12Group {
  start: number
  end: number
  glyphStart: number
}

function format12Cmap(groups: Format12Group[]): Uint8Array {
  const bytes = new Bytes()
  bytes.u16(12)
  bytes.u16(0)
  bytes.u32(16 + groups.length * 12)
  bytes.u32(0)
  bytes.u32(groups.length)
  for (const group of groups) {
    bytes.u32(group.start)
    bytes.u32(group.end)
    bytes.u32(group.glyphStart)
  }
  return bytes.toUint8Array()
}

function unsupportedCmap(): Uint8Array {
  const bytes = new Bytes()
  bytes.u16(6)
  bytes.u16(10)
  bytes.u16(0)
  bytes.u16(0)
  bytes.u16(0)
  return bytes.toUint8Array()
}

function postFormat3(): Uint8Array {
  const bytes = new Bytes()
  bytes.u32(0x00030000)
  for (let i = 0; i < 28; i += 1) bytes.u8(0)
  return bytes.toUint8Array()
}

function postFormat2(nameIndexes: number[], customNames: string[]): Uint8Array {
  const bytes = new Bytes()
  bytes.u32(0x00020000)
  for (let i = 0; i < 28; i += 1) bytes.u8(0)
  bytes.u16(nameIndexes.length)
  for (const nameIndex of nameIndexes) bytes.u16(nameIndex)
  for (const name of customNames) {
    const encodedName = new TextEncoder().encode(name)
    bytes.u8(encodedName.length)
    bytes.pushBytes(encodedName)
  }
  return bytes.toUint8Array()
}
