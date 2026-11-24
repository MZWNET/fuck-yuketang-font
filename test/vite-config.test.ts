import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('vite userscript config', () => {
  it('enables the userscript on the legacy exercise pages and the lms-graph exercise iframe', () => {
    const viteConfigSource = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8')

    expect(viteConfigSource).toContain(
      '\'*://www.yuketang.cn/v2/web/cloud/student/exercise/*\'',
    )
    expect(viteConfigSource).toContain(
      '\'*://www.yuketang.cn/v2/web/iframe-exercise/*\'',
    )
    expect(viteConfigSource).not.toContain('noframes: true')
    expect(viteConfigSource).not.toContain('*://*.yuketang.cn/*')
    expect(viteConfigSource).not.toContain('*://*.xuetangx.com/*')
  })
})
