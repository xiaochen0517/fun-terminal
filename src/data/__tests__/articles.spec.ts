import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { commandRuntime } from '@/commands'
import { dataSource } from '@/data'
import { buildArticleCatalog } from '@/data/static/catalog'
import type { FetchResponseLike } from '@/data/static/StaticDataSource'

// Vitest 的 root 为项目根目录；直接以 cwd 定位 public 静态资源，避免依赖 import.meta.url 的形态。
const CONTENT_DIR = join(process.cwd(), 'public', 'content', 'articles')
const MANIFEST_PATH = join(CONTENT_DIR, 'index.json')

interface ArticleManifest {
  articles: unknown[]
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as ArticleManifest

const articleIds = readdirSync(CONTENT_DIR)
  .filter((name) => name.endsWith('.md'))
  .map((name) => name.slice(0, -'.md'.length))
  .sort()

const bodies = new Map(
  articleIds.map((id) => [id, readFileSync(join(CONTENT_DIR, `${id}.md`), 'utf8')]),
)

function fileResponse(path: string): FetchResponseLike {
  const text = readFileSync(path, 'utf8')
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(JSON.parse(text)),
    text: () => Promise.resolve(text),
  }
}

/** 把全局 fetch 替换为「读 public/content」的替身，供应用单例做集成断言 */
function stubContentFetch() {
  const fetchMock = vi.fn<(url: string) => Promise<FetchResponseLike>>((url) => {
    if (url === '/content/articles/index.json') {
      return Promise.resolve(fileResponse(MANIFEST_PATH))
    }
    const match = /^\/content\/articles\/(.+)\.md$/.exec(url)
    if (match?.[1] !== undefined) {
      return Promise.resolve(fileResponse(join(CONTENT_DIR, `${match[1]}.md`)))
    }
    return Promise.reject(new Error(`unexpected url: ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('article data on disk', () => {
  it('declares three articles in the JSON manifest', () => {
    expect(Array.isArray(manifest.articles)).toBe(true)
    expect(manifest.articles).toHaveLength(3)
  })

  it('keeps the manifest and markdown files one-to-one', () => {
    const catalog = buildArticleCatalog(manifest.articles)
    const declaredIds = catalog.summaries.map((summary) => summary.id).sort()

    expect(catalog.issues).toEqual([])
    expect(declaredIds).toEqual(articleIds)
  })

  it('serves articles in date-descending order', () => {
    const catalog = buildArticleCatalog(manifest.articles)

    expect(catalog.summaries.map((summary) => summary.id)).toEqual([
      'vfs-notes',
      'about',
      'hello',
    ])
  })

  it('counts tags: 公告 appears twice and there are six unique tags', () => {
    const catalog = buildArticleCatalog(manifest.articles)
    const counts = new Map<string, number>()

    for (const summary of catalog.summaries) {
      for (const tag of summary.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }

    expect(counts.get('公告')).toBe(2)
    expect(counts.size).toBe(6)
    for (const [tag, count] of counts) {
      expect(count).toBe(tag === '公告' ? 2 : 1)
    }
  })

  it('keeps every body readable by cat: single trailing newline, no NUL, under 200 KB', () => {
    for (const body of bodies.values()) {
      expect(body).not.toBe('')
      expect(body).not.toContain('\0')
      expect(body.endsWith('\n')).toBe(true)
      expect(body.endsWith('\n\n')).toBe(false)
      expect(new TextEncoder().encode(body).byteLength).toBeLessThanOrEqual(200 * 1024)
      expect(body.startsWith('# ')).toBe(true)
      expect(body.startsWith('---')).toBe(false)
    }
  })

  it('covers the markdown elements needed by the blog renderer', () => {
    const all = [...bodies.values()].join('\n')

    expect(all).toMatch(/^## /m)
    expect(all).toMatch(/^- /m)
    expect(all).toMatch(/^\d+\. /m)
    expect(all).toMatch(/^```ts$/m)
    expect(all).toMatch(/`[^`\n]+`/)
    expect(all).toMatch(/\[[^\]]+\]\(https:\/\/[^)]+\)/)
    expect(all).toMatch(/^\|.+\|$/m)
    expect(all).toMatch(/^> /m)
  })

  it('keeps a long code line for horizontal scrolling checks', () => {
    const longest = Math.max(
      ...(bodies.get('vfs-notes') ?? '')
        .split('\n')
        .map((line) => line.length),
    )

    expect(longest).toBeGreaterThanOrEqual(100)
  })
})

describe('application data source', () => {
  it('is wired into the command runtime as the same instance', () => {
    expect(commandRuntime.deps.dataSource).toBe(dataSource)
  })

  it('loads the real manifest and article through fetch', async () => {
    const fetchMock = stubContentFetch()

    const list = await dataSource.fetchArticleList()
    expect(list.map((summary) => summary.id)).toEqual(['vfs-notes', 'about', 'hello'])

    const article = await dataSource.fetchArticle('hello')
    expect(article?.content).toBe(bodies.get('hello'))

    expect(fetchMock).toHaveBeenCalledWith('/content/articles/index.json')
    expect(fetchMock).toHaveBeenCalledWith('/content/articles/hello.md')
  })
})
