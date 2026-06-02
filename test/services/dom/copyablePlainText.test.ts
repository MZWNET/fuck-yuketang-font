import { describe, expect, it } from 'vitest'
import { ROOT_ID } from '../../../src/constants/userscript'
import { extractCopyablePlainText } from '../../../src/services/dom/copyablePlainText'

describe('copyable plain text DOM helper', () => {
  it('formats exercise text from visible page structure', () => {
    document.body.replaceChildren()
    const question = document.createElement('section')
    question.innerHTML = `
      <div>1.单选题</div>
      <div>(1分)</div>
      <p>在教材推荐的字符串处理⽅式中,优先选择()。</p>
      <div>A</div>
      <div>C⻛格字符数组</div>
      <div>B</div>
      <div>string类</div>
      <div>C</div>
      <div>字符指针常量</div>
      <div>D</div>
      <div>⼿⼯逐字符拼接</div>
    `
    const panel = document.createElement('div')
    panel.id = ROOT_ID
    panel.textContent = '复制明文'
    document.body.append(question, panel)

    expect(extractCopyablePlainText()).toBe([
      '1. 单选题 (1分)',
      '在教材推荐的字符串处理⽅式中,优先选择()。',
      'A. C⻛格字符数组',
      'B. string类',
      'C. 字符指针常量',
      'D. ⼿⼯逐字符拼接',
    ].join('\n'))
  })

  it('copies only the current exercise block from a noisy page', () => {
    document.body.replaceChildren()
    document.body.innerHTML = `
      <header>
        <div>当前浏览器可能无法正常使用雨课堂网页版，</div>
        <div>你好，xxx</div>
        <div>课程班级</div>
      </header>
      <nav>
        <div>75/75题</div>
        <div>1</div>
        <div>2</div>
        <div>未批改</div>
      </nav>
      <main>
        <div>1.单选题</div>
        <div>(1分)</div>
        <p>在教材推荐的字符串处理⽅式中,优先选择()。</p>
        <div>A</div>
        <div>C⻛格字符数组</div>
        <div>B</div>
        <div>string类</div>
        <div>C</div>
        <div>字符指针常量</div>
        <div>D</div>
        <div>⼿⼯逐字符拼接</div>
        <div>本题得分：1</div>
        <div>正确答案：B</div>
        <button>上一题</button>
        <button>已提交</button>
        <button>下一题</button>
        <button>批注</button>
      </main>
    `

    expect(extractCopyablePlainText()).toBe([
      '1. 单选题 (1分)',
      '在教材推荐的字符串处理⽅式中,优先选择()。',
      'A. C⻛格字符数组',
      'B. string类',
      'C. 字符指针常量',
      'D. ⼿⼯逐字符拼接',
    ].join('\n'))
  })

  it('handles inline text, line breaks, skipped nodes, and incomplete exercise markers', () => {
    document.body.replaceChildren()
    const wrapper = document.createDocumentFragment()
    const inline = document.createElement('span')
    inline.append('普通', document.createTextNode('  文本'))
    const lineBreak = document.createElement('br')
    const heading = document.createElement('div')
    heading.textContent = '普通标题'
    const optionWithoutText = document.createElement('div')
    optionWithoutText.textContent = 'A'
    const script = document.createElement('script')
    script.textContent = 'hidden'
    const panel = document.createElement('aside')
    panel.setAttribute('data-fuck-yuketang-font-panel', '')
    panel.textContent = '复制明文'
    wrapper.append(inline, lineBreak, heading, optionWithoutText, script, panel)

    expect(extractCopyablePlainText(wrapper)).toBe([
      '普通 文本',
      '普通标题',
      'A',
    ].join('\n'))
  })
})
