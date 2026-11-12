import { describe, expect, it } from 'vitest'

import { EMPTY_ARTICLES, formatArticleList } from '@/commands/plugins/blog/format'
import { runList } from '@/commands/plugins/blog/list'

import { createBlogContext, createTestDataSource, testArticles } from './fixtures'

describe('blog list', () => {
  it('outputs the full list with the data source order', async () => {
    const { context, chunks } = createBlogContext({ args: ['list'] })

    await runList(context)

    expect(chunks).toEqual([{ type: 'text', content: formatArticleList(testArticles) }])
  })

  it('does not sort the data source result', async () => {
    const reordered = [testArticles[2]!, testArticles[0]!, testArticles[1]!]
    const { context, chunks } = createBlogContext({
      args: ['list'],
      dataSource: createTestDataSource(reordered),
    })

    await runList(context)

    const content = chunks[0]?.type === 'text' ? chunks[0].content : ''
    expect(content.indexOf('hello')).toBeLessThan(content.indexOf('vfs-notes'))
  })

  it('shows a system message for an empty list', async () => {
    const { context, chunks } = createBlogContext({
      args: ['list'],
      dataSource: createTestDataSource([]),
    })

    await runList(context)

    expect(chunks).toEqual([{ type: 'system', content: EMPTY_ARTICLES }])
  })

  it('rejects extra arguments', async () => {
    const { context, chunks } = createBlogContext({ args: ['list', 'foo'] })

    await runList(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'blog: 子命令 list 不接受参数' },
    ])
  })

  it('rejects options', async () => {
    const { context, chunks } = createBlogContext({
      args: ['list'],
      options: { '--raw': true },
    })

    await runList(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'blog: 不支持的选项: --raw' },
    ])
  })
})
