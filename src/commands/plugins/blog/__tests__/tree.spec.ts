import { describe, expect, it } from 'vitest'

import { createBlogTree } from '@/commands/plugins/blog/tree'

import { testArticles } from './fixtures'

function entriesOf(articles = testArticles) {
  return articles.map((article) => ({ summary: article, article }))
}

describe('createBlogTree', () => {
  it('projects entries to <id>.md nodes in input order', () => {
    const tree = createBlogTree(entriesOf())

    expect(tree.type).toBe('directory')
    expect(tree.children?.map((node) => node.name)).toEqual([
      'vfs-notes.md',
      'about.md',
      'hello.md',
    ])
  })

  it('keeps content and metadata', () => {
    const tree = createBlogTree(entriesOf())
    const about = tree.children?.find((node) => node.name === 'about.md')

    expect(about?.type).toBe('file')
    expect(about?.content).toBe(testArticles[1]!.content)
    expect(about?.meta).toEqual({
      mime: 'text/markdown',
      title: '关于本站与作者',
      date: '2026-11-08',
      tags: '公告,随笔',
    })
  })

  it('returns an empty directory for an empty list', () => {
    const tree = createBlogTree([])

    expect(tree.type).toBe('directory')
    expect(tree.children).toEqual([])
  })

  it('does not rewrite a missing trailing newline', () => {
    const article = { ...testArticles[0]!, content: '# 无结尾换行' }
    const tree = createBlogTree([{ summary: article, article }])

    expect(tree.children?.[0]?.content).toBe('# 无结尾换行')
  })

  it('rejects duplicate ids', () => {
    expect(() =>
      createBlogTree([
        { summary: testArticles[0]!, article: testArticles[0]! },
        { summary: testArticles[0]!, article: testArticles[0]! },
      ]),
    ).toThrow('文章 id 重复: vfs-notes')
  })
})
