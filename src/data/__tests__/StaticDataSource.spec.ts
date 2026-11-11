import { describe, expect, it, vi } from 'vitest'

import type { FetchResponseLike } from '@/data/static/StaticDataSource'
import { createStaticDataSource, joinContentUrl } from '@/data/static/StaticDataSource'

const MANIFEST_URL = '/content/articles/index.json'
const bodyUrl = (id: string): string => `/content/articles/${id}.md`

function jsonResponse(payload: unknown): FetchResponseLike {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(JSON.stringify(payload)),
  }
}

function textResponse(text: string, status = 200): FetchResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(null),
    text: () => Promise.resolve(text),
  }
}

function errorResponse(status: number): FetchResponseLike {
  return {
    ok: false,
    status,
    json: () => Promise.resolve(null),
    text: () => Promise.resolve(''),
  }
}

function entry(id: string, date = '2026-01-01', extra: Record<string, unknown> = {}) {
  return {
    id,
    title: `标题 ${id}`,
    date,
    excerpt: `摘要 ${id}`,
    tags: ['标签'],
    ...extra,
  }
}

function manifestOf(...entries: unknown[]): unknown {
  return { articles: entries }
}

/** 按 URL 路由的 fetch 替身；未配置的 URL 视为测试写错 */
function createFetch(routes: Record<string, FetchResponseLike | Error>) {
  return vi.fn<(url: string) => Promise<FetchResponseLike>>((url) => {
    const hit = routes[url]
    if (hit === undefined) return Promise.reject(new Error(`unexpected url: ${url}`))
    return hit instanceof Error ? Promise.reject(hit) : Promise.resolve(hit)
  })
}

function silentOptions() {
  return { onWarn: () => {} }
}

describe('createStaticDataSource', () => {
  it('loads the manifest once and serves sorted, frozen summaries without content', async () => {
    const fetchImpl = createFetch({
      [MANIFEST_URL]: jsonResponse(
        manifestOf(entry('hello', '2026-11-06'), entry('about', '2026-11-08')),
      ),
    })
    const source = createStaticDataSource({ fetchImpl, ...silentOptions() })

    const list = await source.fetchArticleList()

    expect(list.map((summary) => summary.id)).toEqual(['about', 'hello'])
    expect(list[0]).not.toHaveProperty('content')
    expect(Object.isFrozen(list[0])).toBe(true)
    expect(Object.isFrozen(list[0]?.tags)).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    const again = await source.fetchArticleList()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(again).not.toBe(list)
    expect(again[0]).toBe(list[0])
  })

  it('resolves the manifest and article URLs under baseUrl', async () => {
    const fetchImpl = createFetch({
      '/site/content/articles/index.json': jsonResponse(manifestOf(entry('hello'))),
      '/site/content/articles/hello.md': textResponse('# 你好\n'),
    })
    const source = createStaticDataSource({
      baseUrl: '/site/',
      fetchImpl,
      ...silentOptions(),
    })

    const article = await source.fetchArticle('hello')

    expect(article?.content).toBe('# 你好\n')
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      '/site/content/articles/index.json',
      '/site/content/articles/hello.md',
    ])
  })

  it('returns null for unknown ids without requesting a body', async () => {
    const fetchImpl = createFetch({
      [MANIFEST_URL]: jsonResponse(manifestOf(entry('hello'))),
    })
    const source = createStaticDataSource({ fetchImpl, ...silentOptions() })

    expect(await source.fetchArticle('nope')).toBeNull()
    expect(await source.fetchArticle('')).toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('caches the article body and the frozen article object', async () => {
    const fetchImpl = createFetch({
      [MANIFEST_URL]: jsonResponse(manifestOf(entry('hello'))),
      [bodyUrl('hello')]: textResponse('# 你好\n'),
    })
    const source = createStaticDataSource({ fetchImpl, ...silentOptions() })

    const first = await source.fetchArticle('hello')
    const second = await source.fetchArticle('hello')

    expect(first).toMatchObject({ id: 'hello', content: '# 你好\n' })
    expect(Object.isFrozen(first)).toBe(true)
    expect(second).toBe(first)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('retries the manifest after a failed load', async () => {
    let manifestCalls = 0
    const fetchImpl = vi.fn<(url: string) => Promise<FetchResponseLike>>((url) => {
      if (url !== MANIFEST_URL) return Promise.reject(new Error(`unexpected url: ${url}`))
      manifestCalls += 1
      return Promise.resolve(
        manifestCalls === 1
          ? errorResponse(500)
          : jsonResponse(manifestOf(entry('hello'))),
      )
    })
    const warnings: string[] = []
    const source = createStaticDataSource({
      fetchImpl,
      onWarn: (message) => warnings.push(message),
    })

    expect(await source.fetchArticleList()).toEqual([])
    expect(warnings.some((message) => message.includes('HTTP 500'))).toBe(true)

    expect(await source.fetchArticleList()).toHaveLength(1)
    expect(manifestCalls).toBe(2)
  })

  it('degrades to an empty list when the manifest is not valid JSON', async () => {
    const fetchImpl = createFetch({
      [MANIFEST_URL]: {
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
        text: () => Promise.resolve(''),
      },
    })
    const warnings: string[] = []
    const source = createStaticDataSource({
      fetchImpl,
      onWarn: (message) => warnings.push(message),
    })

    expect(await source.fetchArticleList()).toEqual([])
    expect(warnings.some((message) => message.includes('文章清单解析失败'))).toBe(true)
  })

  it.each([
    ['缺少 articles 数组', {}],
    ['articles 不是数组', { articles: 'hello' }],
    ['根不是对象', ['hello']],
  ])('degrades to an empty list when the manifest shape is invalid: %s', (_label, payload) => {
    const fetchImpl = createFetch({ [MANIFEST_URL]: jsonResponse(payload) })
    const warnings: string[] = []
    const source = createStaticDataSource({
      fetchImpl,
      onWarn: (message) => warnings.push(message),
    })

    return source.fetchArticleList().then((list) => {
      expect(list).toEqual([])
      expect(warnings.some((message) => message.includes('文章清单格式非法'))).toBe(true)
    })
  })

  it('skips invalid metadata entries and warns', async () => {
    const fetchImpl = createFetch({
      [MANIFEST_URL]: jsonResponse(
        manifestOf(entry('hello'), entry('broken', '2026/11/06')),
      ),
    })
    const warnings: string[] = []
    const source = createStaticDataSource({
      fetchImpl,
      onWarn: (message) => warnings.push(message),
    })

    const list = await source.fetchArticleList()

    expect(list.map((summary) => summary.id)).toEqual(['hello'])
    expect(warnings.some((message) => message.includes('文章元数据'))).toBe(true)
    expect(warnings.some((message) => message.includes('日期不合法'))).toBe(true)
  })

  it('returns null and warns when a body is missing', async () => {
    const fetchImpl = createFetch({
      [MANIFEST_URL]: jsonResponse(manifestOf(entry('hello'))),
      [bodyUrl('hello')]: errorResponse(404),
    })
    const warnings: string[] = []
    const source = createStaticDataSource({
      fetchImpl,
      onWarn: (message) => warnings.push(message),
    })

    expect(await source.fetchArticle('hello')).toBeNull()
    expect(await source.fetchArticle('hello')).toBeNull()
    expect(
      warnings.filter((message) => message.includes('正文加载失败（HTTP 404）')),
    ).toHaveLength(1)
    expect(fetchImpl.mock.calls.filter(([url]) => url === bodyUrl('hello'))).toHaveLength(2)
  })

  it('returns null when the body request rejects', async () => {
    const fetchImpl = createFetch({
      [MANIFEST_URL]: jsonResponse(manifestOf(entry('hello'))),
      [bodyUrl('hello')]: new Error('network down'),
    })
    const warnings: string[] = []
    const source = createStaticDataSource({
      fetchImpl,
      onWarn: (message) => warnings.push(message),
    })

    expect(await source.fetchArticle('hello')).toBeNull()
    expect(warnings.some((message) => message.includes('正文加载失败: hello'))).toBe(true)
  })

  it.each([
    ['空内容', '   \n', '内容为空'],
    ['二进制内容', '# 标题\n\u0000\n', '含二进制内容'],
    ['超过 200 KB', `${'a'.repeat(200 * 1024 + 1)}\n`, '超过 200 KB'],
  ])('rejects unreadable body: %s', (_label, content, expected) => {
    const fetchImpl = createFetch({
      [MANIFEST_URL]: jsonResponse(manifestOf(entry('hello'))),
      [bodyUrl('hello')]: textResponse(content),
    })
    const warnings: string[] = []
    const source = createStaticDataSource({
      fetchImpl,
      onWarn: (message) => warnings.push(message),
    })

    return source.fetchArticle('hello').then((article) => {
      expect(article).toBeNull()
      expect(warnings.some((message) => message.includes(expected))).toBe(true)
    })
  })

  it('keeps a body without trailing newline but warns once', async () => {
    const fetchImpl = createFetch({
      [MANIFEST_URL]: jsonResponse(manifestOf(entry('hello'))),
      [bodyUrl('hello')]: textResponse('# 标题'),
    })
    const warnings: string[] = []
    const source = createStaticDataSource({
      fetchImpl,
      onWarn: (message) => warnings.push(message),
    })

    expect((await source.fetchArticle('hello'))?.content).toBe('# 标题')
    expect((await source.fetchArticle('hello'))?.content).toBe('# 标题')
    expect(
      warnings.filter((message) => message.includes('缺少结尾换行')),
    ).toHaveLength(1)
    expect(fetchImpl.mock.calls.filter(([url]) => url === bodyUrl('hello'))).toHaveLength(1)
  })

  it('handles an empty article list', async () => {
    const fetchImpl = createFetch({
      [MANIFEST_URL]: jsonResponse(manifestOf()),
    })
    const source = createStaticDataSource({ fetchImpl, ...silentOptions() })

    expect(await source.fetchArticleList()).toEqual([])
    expect(await source.fetchArticle('hello')).toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('ignores non-string ids at runtime', async () => {
    const fetchImpl = createFetch({})
    const source = createStaticDataSource({ fetchImpl, ...silentOptions() })

    expect(await source.fetchArticle(undefined as unknown as string)).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('uses console.warn by default and keeps the warning once', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const fetchImpl = createFetch({ [MANIFEST_URL]: errorResponse(404) })
      const source = createStaticDataSource({ fetchImpl })

      await source.fetchArticleList()
      await source.fetchArticleList()

      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(String(warnSpy.mock.calls[0]?.[0])).toContain('[fun-terminal]')
    } finally {
      warnSpy.mockRestore()
    }
  })
})

describe('joinContentUrl', () => {
  it.each([
    ['/', 'content/a.json', '/content/a.json'],
    ['/base/', 'content/a.json', '/base/content/a.json'],
    ['/base', 'content/a.json', '/base/content/a.json'],
    ['https://cdn.example.com/site/', 'content/a.json', 'https://cdn.example.com/site/content/a.json'],
    ['', 'content/a.json', '/content/a.json'],
  ])('joins base %s with %s', (base, path, expected) => {
    expect(joinContentUrl(base, path)).toBe(expected)
  })
})
