import { describe, expect, it } from 'vitest'

import { EMPTY_ARTICLES, formatArticleRows } from '@/commands/plugins/blog/format'
import { runTag } from '@/commands/plugins/blog/tag'

import { createBlogContext, createTestDataSource, testArticles } from './fixtures'

describe('blog tag', () => {
  it('filters articles by exact tag and reuses the list row format', async () => {
    const { context, chunks } = createBlogContext({ args: ['tag', '公告'] })

    await runTag(context)

    const expected = `标签「公告」下的文章（2 篇）：\n\n${formatArticleRows([
      testArticles[1]!,
      testArticles[2]!,
    ])}`
    expect(chunks).toEqual([{ type: 'text', content: expected }])
  })

  it('supports another tag and trims the keyword', async () => {
    const { context, chunks } = createBlogContext({ args: ['tag', '  入门  '] })

    await runTag(context)

    const content = chunks[0]?.type === 'text' ? chunks[0].content : ''
    expect(content.startsWith('标签「入门」下的文章（1 篇）：')).toBe(true)
    expect(content).toContain('hello')
  })

  it('is case-sensitive for ASCII tags', async () => {
    const source = createTestDataSource([{ ...testArticles[0]!, tags: ['Tech'] }])

    const exact = createBlogContext({ args: ['tag', 'Tech'], dataSource: source })
    await runTag(exact.context)
    expect(exact.chunks[0]?.type).toBe('text')

    const lower = createBlogContext({ args: ['tag', 'tech'], dataSource: source })
    await runTag(lower.context)
    expect(lower.chunks).toEqual([
      {
        type: 'error',
        content: 'blog: 标签「tech」下暂无文章，输入 blog tags 查看全部标签',
      },
    ])
  })

  it('reports a tag without matches', async () => {
    const { context, chunks } = createBlogContext({ args: ['tag', '不存在'] })

    await runTag(context)

    expect(chunks).toEqual([
      {
        type: 'error',
        content: 'blog: 标签「不存在」下暂无文章，输入 blog tags 查看全部标签',
      },
    ])
  })

  it('uses the article empty state before tag matching', async () => {
    const { context, chunks } = createBlogContext({
      args: ['tag', '公告'],
      dataSource: createTestDataSource([]),
    })

    await runTag(context)

    expect(chunks).toEqual([{ type: 'system', content: EMPTY_ARTICLES }])
  })

  it('requires one tag', async () => {
    const missing = createBlogContext({ args: ['tag'] })
    await runTag(missing.context)
    expect(missing.chunks).toEqual([
      { type: 'error', content: 'blog: 缺少标签（用法: blog tag <标签>）' },
    ])

    const multiple = createBlogContext({ args: ['tag', 'a', 'b'] })
    await runTag(multiple.context)
    expect(multiple.chunks).toEqual([
      { type: 'error', content: 'blog: 参数过多（一次只能筛选一个标签）' },
    ])
  })

  it('rejects options', async () => {
    const { context, chunks } = createBlogContext({
      args: ['tag', '公告'],
      options: { '--raw': true },
    })

    await runTag(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'blog: 不支持的选项: --raw' },
    ])
  })
})
