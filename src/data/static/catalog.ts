/**
 * 静态文章目录（元数据）构建
 *
 * 元数据由 `public/content/articles/index.json` 在运行时加载，构建期无法类型约束，
 * 因此把「校验 + 归一化 + 排序 + 冻结」收敛为纯函数：输入任意 JSON 值，输出可安全
 * 交给命令层的只读摘要列表与问题清单。
 *
 * 本模块不依赖 fetch、Store 或组件，可独立单测。
 */

import type { ArticleSummary } from '@/data/DataSource'

/** 校验问题类型（只覆盖元数据；正文可用性由数据源在加载时判断） */
export type ArticleIssueKind =
  | 'invalid-entry'
  | 'invalid-id'
  | 'duplicate-id'
  | 'invalid-title'
  | 'invalid-date'
  | 'invalid-excerpt'
  | 'invalid-tags'

/** 单条元数据问题：不抛错，交给测试断言或运行时告警 */
export interface ArticleIssue {
  kind: ArticleIssueKind
  /** 定位信息：`articles[<下标>]`，可带 id */
  source: string
  /** 面向开发者的中文说明，已包含定位信息 */
  message: string
}

/** 构建结果：已排序、已冻结的摘要列表 + 问题清单 */
export interface ArticleCatalog {
  readonly summaries: readonly ArticleSummary[]
  readonly issues: readonly ArticleIssue[]
}

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_ID_LENGTH = 64
const MAX_TITLE_LENGTH = 120
const MAX_EXCERPT_LENGTH = 200
const MAX_TAGS = 8
const MAX_TAG_LENGTH = 24

/** 归一化后的元数据（不含正文） */
interface NormalizedMeta {
  id: string
  title: string
  date: string
  excerpt: string
  tags: string[]
}

type EntryResult = { ok: true; meta: NormalizedMeta } | { ok: false; issue: ArticleIssue }

/** 判断一个未知值是否为普通对象（排除数组与 null） */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sourceOf(index: number, id?: string): string {
  const base = `articles[${index}]`
  return id === undefined ? base : `${base}（id: ${id}）`
}

function issue(
  kind: ArticleIssueKind,
  index: number,
  detail: string,
  id?: string,
): ArticleIssue {
  const source = sourceOf(index, id)
  return { kind, source, message: `${source}: ${detail}` }
}

function normalizeTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const title = value.trim()
  if (title === '' || title.length > MAX_TITLE_LENGTH) return null
  if (/[\r\n]/.test(title)) return null
  return title
}

function normalizeExcerpt(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const excerpt = value.trim()
  if (excerpt === '' || excerpt.length > MAX_EXCERPT_LENGTH) return null
  if (/[\r\n]/.test(excerpt)) return null
  return excerpt
}

/** 日期必须是 `YYYY-MM-DD` 且真实存在（UTC 往返校验可拦住 2026-02-30） */
function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function normalizeTags(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_TAGS) return null

  const tags: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return null
    const tag = item.trim()
    if (tag === '' || /\s/.test(tag) || tag.length > MAX_TAG_LENGTH) return null
    if (tags.includes(tag)) return null
    tags.push(tag)
  }
  return tags
}

function normalizeEntry(entry: unknown, index: number): EntryResult {
  if (!isRecord(entry)) {
    return { ok: false, issue: issue('invalid-entry', index, '条目必须是对象') }
  }

  const { id, title, date, excerpt, tags } = entry

  if (typeof id !== 'string' || !ID_PATTERN.test(id) || id.length > MAX_ID_LENGTH) {
    return {
      ok: false,
      issue: issue('invalid-id', index, `id 不合法（需小写 kebab-case，1-64 字符）: ${String(id)}`),
    }
  }

  const normalizedTitle = normalizeTitle(title)
  if (normalizedTitle === null) {
    return {
      ok: false,
      issue: issue('invalid-title', index, '标题不合法（需单行非空，≤ 120 字符）', id),
    }
  }

  if (!isValidDate(date)) {
    return {
      ok: false,
      issue: issue('invalid-date', index, `日期不合法（需 YYYY-MM-DD 的真实日期）: ${String(date)}`, id),
    }
  }

  const normalizedExcerpt = normalizeExcerpt(excerpt)
  if (normalizedExcerpt === null) {
    return {
      ok: false,
      issue: issue('invalid-excerpt', index, '摘要不合法（需单行非空，≤ 200 字符）', id),
    }
  }

  const normalizedTags = normalizeTags(tags)
  if (normalizedTags === null) {
    return {
      ok: false,
      issue: issue(
        'invalid-tags',
        index,
        '标签不合法（需 1-8 个无空白的词，每个 ≤ 24 字符且不重复）',
        id,
      ),
    }
  }

  return {
    ok: true,
    meta: {
      id,
      title: normalizedTitle,
      date,
      excerpt: normalizedExcerpt,
      tags: normalizedTags,
    },
  }
}

/** 冻结单条摘要（tags 复制后冻结，避免外部改写清单对象污染目录） */
function toSummary(meta: NormalizedMeta): ArticleSummary {
  const tags = Object.freeze([...meta.tags]) as string[]
  return Object.freeze({
    id: meta.id,
    title: meta.title,
    date: meta.date,
    excerpt: meta.excerpt,
    tags,
  })
}

/**
 * 由任意 JSON 元数据数组构建只读目录。
 *
 * 规则：非法条目跳过并记 issue；重复 id 保留先出现者；日期倒序，同日按 id 升序。
 */
export function buildArticleCatalog(entries: readonly unknown[]): ArticleCatalog {
  const metas: NormalizedMeta[] = []
  const issues: ArticleIssue[] = []
  const acceptedIds = new Set<string>()

  entries.forEach((entry, index) => {
    const result = normalizeEntry(entry, index)
    if (!result.ok) {
      issues.push(result.issue)
      return
    }
    if (acceptedIds.has(result.meta.id)) {
      issues.push(
        issue('duplicate-id', index, `文章 id 重复，已保留先出现的条目: ${result.meta.id}`, result.meta.id),
      )
      return
    }
    acceptedIds.add(result.meta.id)
    metas.push(result.meta)
  })

  metas.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  return {
    summaries: Object.freeze(metas.map(toSummary)),
    issues: Object.freeze(issues),
  }
}
