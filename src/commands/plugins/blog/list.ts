/**
 * blog list
 *
 * 数据源已按日期倒序、同日 id 升序排序并冻结；命令不再排序。
 */

import { rejectUnknownOptions } from '@/commands/path-argument'
import type { CommandContext } from '@/terminal/context/CommandContext'

import { EMPTY_ARTICLES, fail, formatArticleList } from './format'

export async function runList(ctx: CommandContext): Promise<void> {
  const optionError = rejectUnknownOptions('blog', ctx.options, [])
  if (optionError) return fail(ctx, optionError)
  if (ctx.args.length > 1) return fail(ctx, 'blog: 子命令 list 不接受参数')

  const summaries = await ctx.dataSource.fetchArticleList()
  if (summaries.length === 0) {
    ctx.output.push({ type: 'system', content: EMPTY_ARTICLES })
    return
  }

  ctx.output.write(formatArticleList(summaries))
}
