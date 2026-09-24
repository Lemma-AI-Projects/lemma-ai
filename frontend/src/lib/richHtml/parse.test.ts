import type { Element, ElementContent, Root } from 'hast'
import { describe, expect, it } from 'vitest'

import { filterStyle } from './normalize'
import { hasRichHtmlAnchor, parseRichHtml } from './parse'

function elements(tree: Root): Element[] {
  const result: Element[] = []
  const walk = (nodes: readonly ElementContent[]) => {
    for (const node of nodes) {
      if (node.type !== 'element') continue
      result.push(node)
      walk(node.children)
    }
  }
  walk(tree.children as ElementContent[])
  return result
}

function first(tree: Root, tagName: string): Element {
  const found = elements(tree).find((element) => element.tagName === tagName)
  if (!found) throw new Error(`no <${tagName}>`)
  return found
}

describe('parseRichHtml 清洗', () => {
  it('删除脚本类元素及其内容', () => {
    const { tree } = parseRichHtml(
      '<p>a<script>alert(1)</script><iframe src="https://x"></iframe><style>p{}</style>b</p>'
    )
    const tags = elements(tree).map((element) => element.tagName)
    expect(tags).toEqual(['p'])
    expect(JSON.stringify(tree)).not.toContain('alert')
  })

  it('丢弃事件属性、危险协议与版权噪音', () => {
    const { tree } = parseRichHtml(
      '<p onclick="x()" data-copyright="xkw"><img src="javascript:alert(1)" onerror="x()"><img src="data:image/png;base64,AA"><img src="https://img.xkw.com/a.png" width="135" height="159"></p>'
    )
    const p = first(tree, 'p')
    expect(p.properties).toEqual({})
    const images = elements(tree).filter((element) => element.tagName === 'img')
    expect(images.map((image) => image.properties.src)).toEqual([
      undefined,
      undefined,
      'https://img.xkw.com/a.png',
    ])
    expect(images[2].properties).toMatchObject({ width: 135, height: 159 })
  })

  it('未知标签解包，保留文字', () => {
    const { tree, warnings } = parseRichHtml('<p><font color="red">红</font>字</p>')
    expect(elements(tree).map((element) => element.tagName)).toEqual(['p'])
    expect(JSON.stringify(tree)).toContain('红')
    expect(warnings).toContain('unwrapped <font>')
  })

  it('只保留白名单内的 class', () => {
    const { tree } = parseRichHtml('<span class="qml-bk evil">x</span>')
    expect(first(tree, 'span').properties.className).toEqual(['qml-bk'])
  })
})

describe('样式与装饰归一化', () => {
  it('去掉字体与颜色，保留排版语义', () => {
    expect(
      filterStyle("font-family: 宋体; text-align: left; text-indent: 28px; color: red; font-style: italic")
    ).toEqual({ style: 'text-align: left; text-indent: 28px; font-style: italic', underline: false })
  })

  it('边框简写只留宽度与线型，颜色交给主题', () => {
    expect(filterStyle('border: 1px solid black; border-color: black').style).toBe(
      'border: 1px solid'
    )
    expect(
      filterStyle('border-width:1px 0px 0px 1px;border-style:solid none none solid;border-color:black;').style
    ).toBe('border-width: 1px 0px 0px 1px; border-style: solid none none solid')
  })

  it('拒绝可执行的样式值', () => {
    expect(filterStyle('width: expression(alert(1)); height: url(x)').style).toBe('')
  })

  it('破损的内联样式不会带出下划线以外的内容', () => {
    expect(
      filterStyle("text-decoration: underline;text-underline-position: underfont-family: 'Times New Roman';")
    ).toEqual({ style: '', underline: true })
  })

  it('wave / em / u 属性映射为 data-decor', () => {
    const { tree } = parseRichHtml(
      '<span wave>波浪</span><span em>着重</span><span u>下划</span><span style="text-decoration: underline">样式下划</span>'
    )
    const decors = elements(tree).map((element) => element.properties.dataDecor)
    expect(decors).toEqual(['wave', 'em', 'u', 'u'])
  })

  it('答题空自己的下划线样式不当作装饰', () => {
    const { tree } = parseRichHtml(
      '<span class="qml-bk" style="text-decoration:underline"> </span>'
    )
    expect(first(tree, 'span').properties.dataDecor).toBeUndefined()
  })

  it('空格占位、斜线格、表格对齐、高亮 em 标签', () => {
    const { tree } = parseRichHtml(
      '<span qml-space-size="3">&nbsp;</span><table align="center"><tr><td class="slash-1">事件</td></tr></table><em>高亮</em>'
    )
    expect(first(tree, 'span').properties.dataSpace).toBe('3')
    expect(first(tree, 'table').properties.dataAlign).toBe('center')
    expect(first(tree, 'td').properties.dataCell).toBe('slash')
    expect(elements(tree).some((element) => element.tagName === 'em')).toBe(false)
  })

  it('dropClassNames 整块移除', () => {
    const { tree } = parseRichHtml('<p><span class="ques-no">1. </span>题干</p>', {
      dropClassNames: ['ques-no'],
    })
    expect(elements(tree).map((element) => element.tagName)).toEqual(['p'])
    expect(JSON.stringify(tree)).not.toContain('1. ')
  })
})

describe('MathML 与媒体', () => {
  it('保留 MathML 结构与 latex 属性', () => {
    const { tree } = parseRichHtml(
      '<math latex="$\\frac{3\\sqrt{6}}{2}$"><mrow><mfrac><mrow><mn>3</mn><msqrt><mn>6</mn></msqrt></mrow><mn>2</mn></mfrac></mrow></math>'
    )
    expect(first(tree, 'math').properties.latex).toBe('$\\frac{3\\sqrt{6}}{2}$')
    expect(elements(tree).map((element) => element.tagName)).toEqual([
      'math', 'mrow', 'mfrac', 'mrow', 'mn', 'msqrt', 'mn', 'mn',
    ])
  })

  it('音频保留地址，丢弃学科网私有属性', () => {
    const { tree, warnings } = parseRichHtml(
      '<audio file-size="93401" duration="11" src="https://img.xkw.com/a.mp3" preload="metadata" controls></audio>'
    )
    expect(first(tree, 'audio').properties).toMatchObject({ src: 'https://img.xkw.com/a.mp3' })
    expect(first(tree, 'audio').properties['file-size']).toBeUndefined()
    expect(warnings).toContain('dropped <audio> file-size')
  })
})

describe('锚点', () => {
  it('收集 data-*-id 锚点并按出现顺序排列', () => {
    const html =
      '<p>a<span class="qml-bk" data-slot-id="s1"></span>b<span data-slot-id="s2"></span></p><span data-og-id="og1"></span><span data-sq-id="sq1"></span>'
    const { anchors } = parseRichHtml(html)
    expect(anchors.get('data-slot-id')).toEqual(['s1', 's2'])
    expect(anchors.get('data-og-id')).toEqual(['og1'])
    expect(anchors.get('data-sq-id')).toEqual(['sq1'])
    expect(hasRichHtmlAnchor(html, 'data-slot-id', 's2')).toBe(true)
    expect(hasRichHtmlAnchor(html, 'data-slot-id', 's3')).toBe(false)
  })

  it('同一片段只解析一次', () => {
    const html = '<p>缓存</p>'
    expect(parseRichHtml(html)).toBe(parseRichHtml(html))
  })
})
