import { describe, expect, it } from 'vitest'

import { resolveReadInvocation, runRead } from '@/commands/plugins/blog/read'

import { createBlogContext, createTestDataSource, testArticles } from './fixtures'

describe('blog read', () => {
  it('renders article HTML with meta by default', async () => {
    const { context, chunks } = createBlogContext({ args: ['read', 'vfs-notes'] })

    await runRead(context)

    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.type).toBe('html')
    const html = chunks[0]?.type === 'html' ? chunks[0].content : ''
    expect(html).toContain('<article class="md">')
    expect(html).toContain(
      '<div class="md__meta">2026-11-10 · 技术 / 前端 / 终端</div>',
    )
    expect(html).toContain('<h1>在浏览器里造一个文件系统</h1>')
    expect(html).toContain('<pre><code class="language-ts">')
    expect(html.endsWith('</article>')).toBe(true)
  })

  it('escapes dynamic meta text', async () => {
    const article = {
      ...testArticles[0]!,
      date: '2026-<x>',
      tags: ['a"b', "c'd"],
    }
    const { context, chunks } = createBlogContext({
      args: ['read', 'vfs-notes'],
      dataSource: createTestDataSource([article]),
    })

    await runRead(context)

    const html = chunks[0]?.type === 'html' ? chunks[0].content : ''
    expect(html).toContain('&lt;x&gt;')
    expect(html).toContain('&quot;')
    expect(html).toContain('&#39;')
    expect(html).not.toContain('<x>')
  })

  it('outputs raw Markdown with a trailing newline', async () => {
    const { context, chunks } = createBlogContext({
      args: ['read', 'hello'],
      options: { '--raw': true },
    })

    await runRead(context)

    expect(chunks).toEqual([
      { type: 'text', content: testArticles[2]!.content },
    ])
  })

  it('supports the parser value form blog read --raw <id>', () => {
    const { context } = createBlogContext({
      args: ['read'],
      options: { '--raw': 'hello' },
    })

    expect(resolveReadInvocation(context)).toEqual({
      ok: true,
      id: 'hello',
      raw: true,
    })
  })

  it('supports blog read <id> --raw', () => {
    const { context } = createBlogContext({
      args: ['read', 'hello'],
      options: { '--raw': true },
    })

    expect(resolveReadInvocation(context)).toEqual({
      ok: true,
      id: 'hello',
      raw: true,
    })
  })

  it('reports an unknown article', async () => {
    const { context, chunks } = createBlogContext({ args: ['read', 'nope'] })

    await runRead(context)

    expect(chunks).toEqual([
      {
        type: 'error',
        content: 'blog: 文章不存在: nope，输入 blog list 查看全部文章',
      },
    ])
  })

  it('reports an empty body', async () => {
    const { context, chunks } = createBlogContext({
      args: ['read', 'blank'],
      dataSource: createTestDataSource([
        { ...testArticles[0]!, id: 'blank', content: '   \n' },
      ]),
    })

    await runRead(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'blog: 文章内容为空: blank' },
    ])
  })

  it('requires exactly one id', async () => {
    const missing = createBlogContext({ args: ['read'] })
    await runRead(missing.context)
    expect(missing.chunks).toEqual([
      {
        type: 'error',
        content: 'blog: 缺少文章 id（用法: blog read [--raw] <id>）',
      },
    ])

    const multiple = createBlogContext({ args: ['read', 'hello', 'about'] })
    await runRead(multiple.context)
    expect(multiple.chunks).toEqual([
      { type: 'error', content: 'blog: 参数过多（一次只能阅读一篇）' },
    ])
  })

  it('rejects unknown options', async () => {
    const { context, chunks } = createBlogContext({
      args: ['read', 'hello'],
      options: { '-n': true },
    })

    await runRead(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'blog: 不支持的选项: -n' },
    ])
  })

  it('rejects an option value plus a positional id', () => {
    const { context } = createBlogContext({
      args: ['read', 'about'],
      options: { '--raw': 'hello' },
    })

    expect(resolveReadInvocation(context)).toEqual({
      ok: false,
      message: 'blog: 参数过多（一次只能阅读一篇）',
    })
  })
})
