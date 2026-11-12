import { describe, expect, it } from 'vitest'

import { collectTagCounts, EMPTY_TAGS, formatTagList } from '@/commands/plugins/blog/format'
import { runTags } from '@/commands/plugins/blog/tags'

import { createBlogContext, createTestDataSource, testArticles } from './fixtures'

describe('blog tags', () => {
  it('outputs tags sorted by count then label', async () => {
    const { context, chunks } = createBlogContext({ args: ['tags'] })

    await runTags(context)

    expect(chunks).toEqual([
      {
        type: 'text',
        content: formatTagList(collectTagCounts(testArticles)),
      },
    ])
    const content = chunks[0]?.type === 'text' ? chunks[0].content : ''
    expect(content.startsWith('共 6 个标签（按文章数倒序）：\n\n')).toBe(true)
    expect(content.indexOf('公告（2 篇）')).toBeLessThan(content.indexOf('技术（1 篇）'))
  })

  it('shows a system message when there are no articles or tags', async () => {
    const empty = createBlogContext({
      args: ['tags'],
      dataSource: createTestDataSource([]),
    })
    await runTags(empty.context)
    expect(empty.chunks).toEqual([{ type: 'system', content: EMPTY_TAGS }])

    const untagged = createBlogContext({
      args: ['tags'],
      dataSource: createTestDataSource([{ ...testArticles[0]!, tags: [] }]),
    })
    await runTags(untagged.context)
    expect(untagged.chunks).toEqual([{ type: 'system', content: EMPTY_TAGS }])
  })

  it('rejects extra arguments and options', async () => {
    const extra = createBlogContext({ args: ['tags', 'foo'] })
    await runTags(extra.context)
    expect(extra.chunks).toEqual([
      { type: 'error', content: 'blog: 子命令 tags 不接受参数' },
    ])

    const option = createBlogContext({
      args: ['tags'],
      options: { '--raw': true },
    })
    await runTags(option.context)
    expect(option.chunks).toEqual([
      { type: 'error', content: 'blog: 不支持的选项: --raw' },
    ])
  })
})
