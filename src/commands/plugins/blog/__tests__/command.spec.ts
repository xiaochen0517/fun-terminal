import { describe, expect, it } from 'vitest'

import { blogCommand } from '@/commands/plugins/blog/command'

import { createBlogContext } from './fixtures'

describe('blog command', () => {
  it('reports a missing subcommand', async () => {
    const { context, chunks } = createBlogContext({ args: [] })

    await blogCommand.execute(context)

    expect(chunks).toEqual([
      {
        type: 'error',
        content:
          'blog: 缺少子命令（可用: list / read / tags / tag，输入 help blog 查看用法）',
      },
    ])
  })

  it('reports an unknown subcommand', async () => {
    const { context, chunks } = createBlogContext({ args: ['nope'] })

    await blogCommand.execute(context)

    expect(chunks).toEqual([
      {
        type: 'error',
        content:
          'blog: 未知子命令: nope（可用: list / read / tags / tag，输入 help blog 查看用法）',
      },
    ])
  })

  it('dispatches list, read, tags and tag', async () => {
    const list = createBlogContext({ args: ['list'] })
    await blogCommand.execute(list.context)
    expect(list.chunks[0]?.type).toBe('text')

    const read = createBlogContext({ args: ['read', 'hello'] })
    await blogCommand.execute(read.context)
    expect(read.chunks[0]?.type).toBe('html')

    const tags = createBlogContext({ args: ['tags'] })
    await blogCommand.execute(tags.context)
    expect(tags.chunks[0]?.type).toBe('text')

    const tag = createBlogContext({ args: ['tag', '公告'] })
    await blogCommand.execute(tag.context)
    expect(tag.chunks[0]?.type).toBe('text')
  })

  it('exposes help metadata', () => {
    expect(blogCommand.name).toBe('blog')
    expect(blogCommand.description).toBe('浏览博客文章（list / read / tags / tag）')
    expect(blogCommand.usage).toBe('blog <list|read|tags|tag> [参数]')
  })
})
