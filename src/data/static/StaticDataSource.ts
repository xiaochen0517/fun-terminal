/**
 * 静态数据源（StaticDataSource）
 *
 * 数据不在构建期打进 JS：元数据 `content/articles/index.json` 与正文
 * `content/articles/<id>.md` 作为静态资源发布，运行时通过 `fetch` 按需加载，
 * 因此新增/修改文章只需替换资源，不重新打包命令代码。
 *
 * 关键取舍：
 * - 清单与正文各自缓存：清单只请求一次；正文按 id 懒加载并缓存，重复阅读不重复请求；
 * - 失败不抛错：网络错误、404、格式非法都降级为「空列表 / null」，并只告警一次；
 * - 返回值冻结：摘要与文章不可被命令就地修改，列表每次返回新数组。
 *
 * 本模块不 import Store / 组件；`fetch` 与 `baseUrl` 可注入，便于单测。
 */

import type { Article, ArticleSummary, DataSource } from '@/data/DataSource'
import { buildArticleCatalog, isRecord } from '@/data/static/catalog'

/** fetch 返回值的最小结构（便于测试注入普通对象） */
export interface FetchResponseLike {
  readonly ok: boolean
  readonly status: number
  json(): Promise<unknown>
  text(): Promise<string>
}

/** fetch 实现的最小签名：只按 URL 请求 */
export type FetchLike = (url: string) => Promise<FetchResponseLike>

/** 数据源选项（全部可选；测试通过注入 fetchImpl / baseUrl 隔离真实网络） */
export interface StaticDataSourceOptions {
  /** 静态资源根路径，默认 Vite 的 `import.meta.env.BASE_URL`（兼容子路径部署） */
  baseUrl?: string
  /** fetch 实现，默认全局 `fetch` */
  fetchImpl?: FetchLike
  /** 告警输出，默认 `console.warn`；测试用它断言文案 */
  onWarn?: (message: string) => void
}

const MANIFEST_PATH = 'content/articles/index.json'
const ARTICLE_DIR = 'content/articles'
const MAX_TEXT_BYTES = 200 * 1024
const WARN_PREFIX = '[fun-terminal] '

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).byteLength
}

/** 拼接 base 与相对路径，兼容 `/`、`/base/`、`https://cdn/x/` 三种形态 */
export function joinContentUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  return base === '' ? `/${path}` : `${base}/${path}`
}

function defaultFetch(url: string): Promise<FetchResponseLike> {
  if (typeof fetch !== 'function') {
    return Promise.reject(new Error('当前环境不支持 fetch'))
  }
  return fetch(url)
}

/** 正文可用性：空内容、二进制、超过 cat 阈值时无法在终端中阅读 */
function bodyProblem(content: string): string | null {
  if (content.trim() === '') return '内容为空'
  if (content.includes('\0')) return '含二进制内容'
  if (utf8Bytes(content) > MAX_TEXT_BYTES) return '超过 200 KB'
  return null
}

/** 创建静态数据源（每次调用得到独立缓存，互不影响） */
export function createStaticDataSource(options: StaticDataSourceOptions = {}): DataSource {
  const baseUrl = options.baseUrl ?? import.meta.env.BASE_URL
  const fetchImpl = options.fetchImpl ?? defaultFetch
  const onWarn = options.onWarn ?? ((message: string) => console.warn(message))

  const warned = new Set<string>()
  function warn(message: string): void {
    const text = `${WARN_PREFIX}${message}`
    if (warned.has(text)) return
    warned.add(text)
    onWarn(text)
  }

  let summaries: readonly ArticleSummary[] | null = null
  let summaryById = new Map<string, ArticleSummary>()
  let manifestRequest: Promise<readonly ArticleSummary[]> | null = null
  const bodyRequests = new Map<string, Promise<string | null>>()
  const articles = new Map<string, Article>()

  async function requestManifest(): Promise<readonly ArticleSummary[]> {
    const url = joinContentUrl(baseUrl, MANIFEST_PATH)
    try {
      const response = await fetchImpl(url)
      if (!response.ok) {
        warn(`文章清单加载失败（HTTP ${response.status}）: ${url}`)
        return []
      }

      let payload: unknown
      try {
        payload = await response.json()
      } catch (error) {
        warn(`文章清单解析失败: ${describeError(error)}`)
        return []
      }

      if (!isRecord(payload) || !Array.isArray(payload.articles)) {
        warn('文章清单格式非法: 需要 { "articles": [...] }')
        return []
      }

      const catalog = buildArticleCatalog(payload.articles)
      for (const item of catalog.issues) warn(`文章元数据: ${item.message}`)

      summaries = catalog.summaries
      summaryById = new Map(catalog.summaries.map((summary) => [summary.id, summary]))
      return catalog.summaries
    } catch (error) {
      warn(`文章清单加载失败: ${describeError(error)}`)
      return []
    }
  }

  /** 清单只请求一次；失败不缓存，下次调用可重试 */
  function loadManifest(): Promise<readonly ArticleSummary[]> {
    if (summaries) return Promise.resolve(summaries)
    if (manifestRequest) return manifestRequest
    manifestRequest = requestManifest().finally(() => {
      manifestRequest = null
    })
    return manifestRequest
  }

  async function requestBody(id: string): Promise<string | null> {
    const url = joinContentUrl(baseUrl, `${ARTICLE_DIR}/${encodeURIComponent(id)}.md`)
    try {
      const response = await fetchImpl(url)
      if (!response.ok) {
        warn(`文章正文加载失败（HTTP ${response.status}）: ${id}`)
        return null
      }

      const content = await response.text()
      const problem = bodyProblem(content)
      if (problem !== null) {
        warn(`文章正文不可用（${problem}）: ${id}`)
        return null
      }
      if (!content.endsWith('\n')) warn(`文章正文缺少结尾换行: ${id}`)
      return content
    } catch (error) {
      warn(`文章正文加载失败: ${id}（${describeError(error)}）`)
      return null
    }
  }

  /** 正文成功后才缓存；失败移除缓存，允许下次重试 */
  function loadBody(id: string): Promise<string | null> {
    const pending = bodyRequests.get(id)
    if (pending) return pending

    const request = requestBody(id).then((content) => {
      if (content === null) bodyRequests.delete(id)
      return content
    })
    bodyRequests.set(id, request)
    return request
  }

  async function fetchArticle(id: string): Promise<Article | null> {
    if (typeof id !== 'string') return null

    const manifest = await loadManifest()
    if (manifest.length === 0) return null

    const summary = summaryById.get(id)
    if (!summary) return null

    const cached = articles.get(id)
    if (cached) return cached

    const content = await loadBody(id)
    if (content === null) return null

    const article = Object.freeze({ ...summary, content })
    articles.set(id, article)
    return article
  }

  return {
    async fetchArticleList() {
      const manifest = await loadManifest()
      return [...manifest]
    },
    fetchArticle,
  }
}
