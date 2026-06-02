import { defineConfig } from 'vite'
import monkey from 'vite-plugin-monkey'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [
    solidPlugin(),
    monkey({
      entry: 'src/main.tsx',
      userscript: {
        match: ['*://www.yuketang.cn/v2/web/cloud/student/exercise/*'],
        noframes: true,
        grant: ['GM_xmlhttpRequest'],
        connect: [
          '*.yuketang.cn',
          'fe-static-yuketang.yuketang.cn',
          '*.xuetangx.com',
        ],
      },
    }),
  ],
})
