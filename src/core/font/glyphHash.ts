import { sha1 } from '@noble/hashes/legacy.js'
import { bytesToHex } from '@noble/hashes/utils.js'

const encoder = new TextEncoder()

export function glyphCommandHash(commands: readonly string[]): string {
  return bytesToHex(sha1(encoder.encode(pythonJsonStringArray(commands))))
}

function pythonJsonStringArray(values: readonly string[]): string {
  return `[${values.map(pythonJsonString).join(', ')}]`
}

function pythonJsonString(value: string): string {
  let result = '"'
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code === 0x22)
      result += '\\"'
    else if (code === 0x5C)
      result += '\\\\'
    else if (code === 0x08)
      result += '\\b'
    else if (code === 0x0C)
      result += '\\f'
    else if (code === 0x0A)
      result += '\\n'
    else if (code === 0x0D)
      result += '\\r'
    else if (code === 0x09)
      result += '\\t'
    else if (code < 0x20)
      result += `\\u${code.toString(16).padStart(4, '0')}`
    else result += value[i]
  }
  return `${result}"`
}
