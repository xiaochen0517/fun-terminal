import { describe, expect, it } from 'vitest'

import { buildArticleCatalog } from '@/data/static/catalog'

/** 合法元数据基线：单测按需覆盖字段 */
function meta(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'hello',
    title: '你好，终端',
    date: '2026-11-06',
    excerpt: '这个站点为什么长成终端的样子。',
    tags: ['公告'],
    ...overrides,
  }
}

describe('buildArticleCatalog', () => {
  it('sorts by date descending and then by id ascending', () => {
    const catalog = buildArticleCatalog([
      meta({ id: 'a', date: '2026-01-01' }),
      meta({ id: 'c', date: '2026-01-03' }),
      meta({ id: 'b', date: '2026-01-02' }),
      meta({ id: 'd', date: '2026-01-03' }),
    ])

    expect(catalog.summaries.map((summary) => summary.id)).toEqual(['c', 'd', 'b', 'a'])
    expect(catalog.issues).toEqual([])
  })

  it('trims title / excerpt / tags and drops unknown fields', () => {
    const catalog = buildArticleCatalog([
      meta({
        title: '  标题  ',
        excerpt: '  摘要  ',
        tags: [' 公告 ', '入门'],
        extra: 'ignored',
        draft: true,
      }),
    ])

    expect(catalog.summaries[0]).toEqual({
      id: 'hello',
      title: '标题',
      date: '2026-11-06',
      excerpt: '摘要',
      tags: ['公告', '入门'],
    })
    expect(catalog.summaries[0]).not.toHaveProperty('extra')
  })

  it('reports non-object entries and keeps valid siblings', () => {
    const catalog = buildArticleCatalog([
      null,
      42,
      'hello',
      [],
      meta(),
      undefined,
    ])

    expect(catalog.summaries.map((summary) => summary.id)).toEqual(['hello'])
    expect(catalog.issues).toHaveLength(5)
    expect(catalog.issues.every((issue) => issue.kind === 'invalid-entry')).toBe(true)
    expect(catalog.issues[0]?.source).toBe('articles[0]')
  })

  it.each([
    ['大写字母', 'Hello'],
    ['空格', 'he llo'],
    ['斜杠', 'a/b'],
    ['上跳', '..'],
    ['空串', ''],
    ['前导连字符', '-hello'],
    ['结尾连字符', 'hello-'],
    ['超长', 'a'.repeat(65)],
    ['下划线', 'hello_world'],
  ])('rejects invalid id: %s', (_label, id) => {
    const catalog = buildArticleCatalog([meta({ id })])

    expect(catalog.summaries).toEqual([])
    expect(catalog.issues[0]?.kind).toBe('invalid-id')
    expect(catalog.issues[0]?.source).toBe('articles[0]')
  })

  it('keeps the first entry of a duplicate id and reports the later one', () => {
    const catalog = buildArticleCatalog([
      meta({ title: '第一篇' }),
      meta({ title: '第二篇' }),
    ])

    expect(catalog.summaries).toHaveLength(1)
    expect(catalog.summaries[0]?.title).toBe('第一篇')
    expect(catalog.issues).toHaveLength(1)
    expect(catalog.issues[0]?.kind).toBe('duplicate-id')
    expect(catalog.issues[0]?.source).toBe('articles[1]（id: hello）')
  })

  it.each([
    ['缺失', undefined],
    ['空串', ''],
    ['纯空白', '   '],
    ['含换行', '标题\n第二行'],
    ['超长', 'x'.repeat(121)],
    ['非字符串', 42],
  ])('rejects invalid title: %s', (_label, title) => {
    const catalog = buildArticleCatalog([meta({ title })])

    expect(catalog.summaries).toEqual([])
    expect(catalog.issues[0]?.kind).toBe('invalid-title')
  })

  it.each([
    ['斜杠分隔', '2026/11/06'],
    ['月份越界', '2026-13-01'],
    ['不存在的日期', '2026-02-30'],
    ['非闰年 2 月 29 日', '2026-02-29'],
    ['缺少分隔符', '20261106'],
    ['空串', ''],
    ['非字符串', 20261106],
  ])('rejects invalid date: %s', (_label, date) => {
    const catalog = buildArticleCatalog([meta({ date })])

    expect(catalog.summaries).toEqual([])
    expect(catalog.issues[0]?.kind).toBe('invalid-date')
  })

  it('accepts a real leap day', () => {
    const catalog = buildArticleCatalog([meta({ date: '2024-02-29' })])

    expect(catalog.summaries[0]?.date).toBe('2024-02-29')
    expect(catalog.issues).toEqual([])
  })

  it.each([
    ['缺失', undefined],
    ['空串', ''],
    ['纯空白', '   '],
    ['含换行', '摘要\n第二行'],
    ['超长', 'x'.repeat(201)],
    ['非字符串', ['摘要']],
  ])('rejects invalid excerpt: %s', (_label, excerpt) => {
    const catalog = buildArticleCatalog([meta({ excerpt })])

    expect(catalog.summaries).toEqual([])
    expect(catalog.issues[0]?.kind).toBe('invalid-excerpt')
  })

  it.each([
    ['缺失', undefined],
    ['空数组', []],
    ['非数组', '公告'],
    ['非字符串项', [1]],
    ['纯空白项', ['   ']],
    ['含空白项', ['公 告']],
    ['重复项', ['公告', '公告']],
    ['超过 8 个', Array.from({ length: 9 }, (_, index) => `tag-${index}`)],
    ['单项超长', ['x'.repeat(25)]],
  ])('rejects invalid tags: %s', (_label, tags) => {
    const catalog = buildArticleCatalog([meta({ tags })])

    expect(catalog.summaries).toEqual([])
    expect(catalog.issues[0]?.kind).toBe('invalid-tags')
  })

  it('reports issue messages with index and id', () => {
    const catalog = buildArticleCatalog([meta({ date: '2026/11/06' })])

    expect(catalog.issues).toHaveLength(1)
    expect(catalog.issues[0]?.message).toContain('articles[0]（id: hello）')
    expect(catalog.issues[0]?.message).toContain('日期不合法')
  })

  it('freezes summaries and tag arrays and copies tags away from the input', () => {
    const tags = ['公告']
    const catalog = buildArticleCatalog([meta({ tags })])

    expect(Object.isFrozen(catalog.summaries)).toBe(true)
    expect(Object.isFrozen(catalog.summaries[0])).toBe(true)
    expect(Object.isFrozen(catalog.summaries[0]?.tags)).toBe(true)

    tags.push('入门')
    expect(catalog.summaries[0]?.tags).toEqual(['公告'])
  })

  it('returns empty results for an empty input', () => {
    expect(buildArticleCatalog([])).toEqual({ summaries: [], issues: [] })
  })

  it('keeps issue order stable', () => {
    const catalog = buildArticleCatalog([
      meta({ id: 'ok', date: '2026-01-01' }),
      meta({ id: 'Bad Id' }),
      meta({ id: 'ok' }),
      meta({ date: 'bad' }),
    ])

    expect(catalog.issues.map((issue) => issue.kind)).toEqual([
      'invalid-id',
      'duplicate-id',
      'invalid-date',
    ])
    expect(catalog.summaries.map((summary) => summary.id)).toEqual(['ok'])
  })
})
