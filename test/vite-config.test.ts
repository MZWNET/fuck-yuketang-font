import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('vite userscript config', () => {
  it('only enables the userscript under all yuketang student exercise subpaths', () => {
    const viteConfigSource = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8')

    expect(viteConfigSource).toContain(
      'match: [\'*://www.yuketang.cn/v2/web/cloud/student/exercise/*\']',
    )
    expect(viteConfigSource).not.toContain('*://*.yuketang.cn/*')
    expect(viteConfigSource).not.toContain('*://*.xuetangx.com/*')
  })
})
