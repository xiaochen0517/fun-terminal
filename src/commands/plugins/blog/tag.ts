/**
 * blog tag <tag>
 *
 * 精确匹配（区分大小写、先 trim）；无命中给错误，空清单先走列表空态。
 */

import { rejectUnknownOptions } from '@/commands/path-argument'
import type { CommandContext } from '@/terminal/context/CommandContext'

import { EMPTY_ARTICLES, fail, formatArticleRows } from './format'

export async function runTag(ctx: CommandContext): Promise<void> {
  const optionError = rejectUnknownOptions('blog', ctx.options, [])
  if (optionError) return fail(ctx, optionError)
  if (ctx.args.length < 2) return fail(ctx, 'blog: 缺少标签（用法: blog tag <标签>）')
  if (ctx.args.length > 2) {
    return fail(ctx, 'blog: 参数过多（一次只能筛选一个标签）')
  }

  const keyword = ctx.args[1]!.trim()
  if (keyword === '') return fail(ctx, 'blog: 缺少标签（用法: blog tag <标签>）')

  const summaries = await ctx.dataSource.fetchArticleList()
  if (summaries.length === 0) {
    ctx.output.push({ type: 'system', content: EMPTY_ARTICLES })
    return
  }

  const matches = summaries.filter((summary) => (summary.tags ?? []).includes(keyword))
  if (matches.length === 0) {
    return fail(
      ctx,
      `blog: 标签「${keyword}」下暂无文章，输入 blog tags 查看全部标签`,
    )
  }

  ctx.output.write(
    `标签「${keyword}」下的文章（${matches.length} 篇）：\n\n${formatArticleRows(matches)}`,
  )
}
