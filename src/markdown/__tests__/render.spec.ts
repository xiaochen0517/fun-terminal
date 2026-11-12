import { describe, expect, it } from 'vitest'

import { renderMarkdown } from '@/markdown/render'

describe('renderMarkdown', () => {
  it('renders headings, paragraphs and line breaks', () => {
    const html = renderMarkdown('# 标题\n\n正文第一行\n正文第二行')

    expect(html).toContain('<h1>标题</h1>')
    expect(html).toContain('正文第一行<br>')
    expect(html).toContain('正文第二行')
  })

  it('renders unordered and ordered lists', () => {
    const html = renderMarkdown('- 一\n- 二\n\n1. 甲\n2. 乙')

    expect(html).toContain('<ul>')
    expect(html).toContain('<li>一</li>')
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>甲</li>')
  })

  it('renders fenced code and inline code', () => {
    const html = renderMarkdown('行内 `code`\n\n```ts\nconst a = 1\n```')

    expect(html).toContain('<code>code</code>')
    expect(html).toContain('<pre><code class="language-ts">')
    expect(html).toContain('const a = 1')
  })

  it('renders blockquotes, tables and hr', () => {
    const html = renderMarkdown(
      ['> 引用', '', '| 项目 | 说明 |', '| --- | --- |', '| 形态 | 终端 |', '', '---'].join('\n'),
    )

    expect(html).toContain('<blockquote>')
    expect(html).toContain('<table>')
    expect(html).toContain('<th>项目</th>')
    expect(html).toContain('<hr>')
  })

  it('adds target and rel to links', () => {
    const html = renderMarkdown('[Vue](https://vuejs.org/)')

    expect(html).toContain('href="https://vuejs.org/"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('linkifies bare URLs with the same policy', () => {
    const html = renderMarkdown('访问 https://example.com 查看。')

    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('escapes raw HTML instead of rendering it', () => {
    const html = renderMarkdown('这段 <strong>HTML</strong> 不会生效。')

    expect(html).toContain('&lt;strong&gt;')
    expect(html).not.toContain('<strong>')
  })

  it('does not render script tags or inline event handlers', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>')

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
  })

  it('does not create a javascript: link', () => {
    const html = renderMarkdown('[x](javascript:alert(1))')

    expect(html).not.toContain('href="javascript:')
    expect(html).not.toContain('<a ')
  })

  it('returns an empty string for empty or non-string input', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown(undefined as unknown as string)).toBe('')
  })
})
