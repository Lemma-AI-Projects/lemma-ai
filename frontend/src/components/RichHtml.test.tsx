import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import * as docSamples from '@/mock/question/docSamples'
import type { QuestionFixture } from '@/mock/question/types'
import { RichHtml } from './RichHtml'

const rawSamples = import.meta.glob<string>('../mock/question/raw/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const parsedSamples = Object.entries(docSamples as Record<string, QuestionFixture>).filter(
  ([, fixture]) => fixture.view.structure === 'parsed'
)

function fragmentsOf(fixture: QuestionFixture): string[] {
  const { view, review } = fixture
  return [
    view.stem.html,
    ...view.optionGroups.flatMap((group) => group.options.map((option) => option.content.html)),
    ...view.subQuestions.flatMap((sub) => [
      sub.stem?.html ?? '',
      ...sub.optionGroups.flatMap((group) => group.options.map((option) => option.content.html)),
    ]),
    ...review.explanation.map((segment) => segment.content.html),
    ...review.referenceAnswers.flatMap(({ answer }) =>
      answer.kind === 'rich' ? [answer.content.html] : answer.kind === 'exact' ? [answer.display.html] : []
    ),
  ].filter(Boolean)
}

function render(html: string) {
  return renderToStaticMarkup(<RichHtml html={html} />)
}

describe('文档样例经 RichHtml 渲染', () => {
  it.each(parsedSamples)('%s 的题面快照', (_name, fixture) => {
    const markup = render(fixture.view.stem.html)
    expect(markup).toMatchSnapshot()
  })

  it.each(parsedSamples)('%s 的全部片段都不带字体、脚本与版权噪音', (_name, fixture) => {
    for (const html of fragmentsOf(fixture)) {
      const markup = render(html)
      expect(markup).not.toMatch(/font-family|<script|onerror|onclick|data-copyright/i)
    }
  })

  it('着重号、波浪线、斜线格、MathML、音频都能进入渲染结果', () => {
    const f01 = render(docSamples.f01ChineseIdiomSingle.view.stem.html)
    expect(f01).toContain('data-decor="wave"')
    const f01Option = render(docSamples.f01ChineseIdiomSingle.view.optionGroups[0].options[0].content.html)
    expect(f01Option).toContain('data-decor="em"')
    const f02 = render(docSamples.f02BiologyLabBlanks.view.stem.html)
    expect(f02).toContain('data-cell="slash"')
    expect(f02).toContain('rich-html-table-scroll')
    expect(f02).toContain('src="https://img.xkw.com/')
    const f03 = render(docSamples.f03ListeningSingle.view.stem.html)
    expect(f03).toContain('<audio')
    const f12 = render(docSamples.f12MathmlSubquestions.view.stem.html)
    expect(f12).toContain('<math')
    expect(f12).toContain('<mfrac>')
  })
})

describe('原始学科网 HTML 直接过管线（只读降级的最坏情况）', () => {
  const entries = Object.entries(rawSamples)

  it('12 份原始样例都已导入', () => {
    expect(entries).toHaveLength(12)
  })

  it.each(entries)('%s 清洗后不含字体、脚本与版权噪音，文字不丢', (_path, html) => {
    const markup = render(html)
    expect(markup).not.toMatch(/font-family|<script|onerror|onclick|data-copyright/i)
    expect(markup.replace(/<[^>]+>/g, '').trim().length).toBeGreaterThan(20)
  })
})
