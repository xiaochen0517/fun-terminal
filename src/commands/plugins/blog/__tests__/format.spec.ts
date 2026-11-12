import { describe, expect, it } from 'vitest'

import {
  collectTagCounts,
  EMPTY_ARTICLES,
  EMPTY_TAGS,
  formatArticleList,
  formatArticleRows,
  formatTagList,
  formatTagRows,
} from '@/commands/plugins/blog/format'

import { testArticles } from './fixtures'

describe('blog format', () => {
  it('formats article rows with aligned ids and date fallback', () => {
    expect(formatArticleRows(testArticles)).toBe(
      [
        '  vfs-notes  2026-11-10  在浏览器里造一个文件系统',
        '  about      2026-11-08  关于本站与作者',
        '  hello      2026-11-06  你好，终端',
      ].join('\n'),
    )

    const rows = formatArticleRows([
      { id: 'a', title: 'A', date: '2026-01-01' },
      { id: 'long-id', title: 'B' },
    ])
    expect(rows).toContain('  a        2026-01-01  A')
    expect(rows).toContain('  long-id  —  B')
  })

  it('formats the full article list with header and footer', () => {
    expect(formatArticleList(testArticles)).toBe(
      [
        '共 3 篇文章（按发布日期倒序）：',
        '',
        '  vfs-notes  2026-11-10  在浏览器里造一个文件系统',
        '  about      2026-11-08  关于本站与作者',
        '  hello      2026-11-06  你好，终端',
        '',
        '输入 blog read <id> 阅读全文，输入 blog tags 查看标签。',
      ].join('\n'),
    )
  })

  it('counts tags and sorts by count then label', () => {
    const counts = collectTagCounts(testArticles)

    expect(counts[0]).toEqual({ label: '公告', count: 2 })
    expect(counts).toHaveLength(6)
    expect(counts.map((item) => item.label)).toContain('技术')
    expect(counts.find((item) => item.label === '技术')).toEqual({
      label: '技术',
      count: 1,
    })
  })

  it('sorts equal counts by tag name', () => {
    const counts = collectTagCounts([
      { id: 'a', title: 'A', tags: ['b', 'a'] },
      { id: 'b', title: 'B', tags: ['b'] },
      { id: 'c', title: 'C', tags: ['c'] },
    ])

    expect(counts.map((item) => item.label)).toEqual(['b', 'a', 'c'])
  })

  it('formats tag rows and lists', () => {
    const counts = [
      { label: '公告', count: 2 },
      { label: '技术', count: 1 },
    ]

    expect(formatTagRows(counts)).toBe('  公告（2 篇）\n  技术（1 篇）')
    expect(formatTagList(counts)).toBe(
      ['共 2 个标签（按文章数倒序）：', '', '  公告（2 篇）', '  技术（1 篇）'].join('\n'),
    )
  })

  it('exposes the empty-state messages', () => {
    expect(EMPTY_ARTICLES).toBe(
      'blog: 暂无文章（内容尚未发布或加载失败，稍后重试即可）',
    )
    expect(EMPTY_TAGS).toBe('blog: 暂无标签')
  })
})
