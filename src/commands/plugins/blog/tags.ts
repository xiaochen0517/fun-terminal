/**
 * blog tags
 *
 * 统计全部文章的标签：文章数倒序，数量相同按标签名升序。
 */

import { rejectUnknownOptions } from '@/commands/path-argument'
import type { CommandContext } from '@/terminal/context/CommandContext'

import { collectTagCounts, EMPTY_TAGS, fail, formatTagList } from './format'

export async function runTags(ctx: CommandContext): Promise<void> {
  const optionError = rejectUnknownOptions('blog', ctx.options, [])
  if (optionError) return fail(ctx, optionError)
  if (ctx.args.length > 1) return fail(ctx, 'blog: 子命令 tags 不接受参数')

  const summaries = await ctx.dataSource.fetchArticleList()
  const counts = collectTagCounts(summaries)
  if (counts.length === 0) {
    ctx.output.push({ type: 'system', content: EMPTY_TAGS })
    return
  }

  ctx.output.write(formatTagList(counts))
}
