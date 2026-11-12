/**
 * 博客输出格式化（纯函数）
 *
 * 列表行、标签行与空态文案集中在这里，命令与测试共用；
 * 不读 Store / VFS，也不修改入参。
 */

import type { ArticleSummary } from '@/data/DataSource'
import type { CommandContext } from '@/terminal/context/CommandContext'

/** 统一错误输出 */
export function fail(ctx: CommandContext, message: string): void {
  ctx.output.push({ type: 'error', content: message })
}

/** 文章列表空态（system chunk） */
export const EMPTY_ARTICLES = 'blog: 暂无文章（内容尚未发布或加载失败，稍后重试即可）'

/** 标签列表空态（system chunk） */
export const EMPTY_TAGS = 'blog: 暂无标签'

const TAG_COLLATOR = new Intl.Collator('zh-Hans-CN', { numeric: true })

/** 文章行：id / 日期 / 标题；id 列宽按当前集合自适应 */
export function formatArticleRows(summaries: readonly ArticleSummary[]): string {
  if (summaries.length === 0) return ''

  const idWidth = summaries.reduce((max, item) => Math.max(max, item.id.length), 0)
  return summaries
    .map((item) => `  ${item.id.padEnd(idWidth)}  ${item.date ?? '—'}  ${item.title}`)
    .join('\n')
}

/** 完整列表：标题 + 空行 + 行 + 空行 + 页脚 */
export function formatArticleList(summaries: readonly ArticleSummary[]): string {
  return [
    `共 ${summaries.length} 篇文章（按发布日期倒序）：`,
    '',
    formatArticleRows(summaries),
    '',
    '输入 blog read <id> 阅读全文，输入 blog tags 查看标签。',
  ].join('\n')
}

/** 标签计数 */
export interface TagCount {
  label: string
  count: number
}

/** 统计标签：文章数倒序，数量相同按标签名升序 */
export function collectTagCounts(summaries: readonly ArticleSummary[]): TagCount[] {
  const counts = new Map<string, number>()

  for (const summary of summaries) {
    for (const tag of summary.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || TAG_COLLATOR.compare(left.label, right.label))
}

/** 标签行：`  标签（N 篇）` */
export function formatTagRows(counts: readonly TagCount[]): string {
  return counts.map(({ label, count }) => `  ${label}（${count} 篇）`).join('\n')
}

/** 完整标签列表：标题 + 空行 + 行 */
export function formatTagList(counts: readonly TagCount[]): string {
  return [`共 ${counts.length} 个标签（按文章数倒序）：`, '', formatTagRows(counts)].join('\n')
}
