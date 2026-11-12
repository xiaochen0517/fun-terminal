/**
 * blog read [--raw] <id>
 *
 * 默认输出 `<article class="md">` + meta + Markdown 渲染结果（html chunk）；
 * `--raw` 输出 Markdown 原文（text chunk），与 `cat /mnt/blog/<id>.md` 同源。
 *
 * 解析器会把 `--raw <id>` 解析为 options['--raw'] = id；本模块把它还原为 id，
 * 因此 `blog read --raw hello` 与 `blog read hello --raw` 等价。
 */

import { rejectUnknownOptions } from '@/commands/path-argument'
import { escapeHtml } from '@/markdown/escape'
import { renderMarkdown } from '@/markdown/render'
import type { CommandContext } from '@/terminal/context/CommandContext'

import { fail } from './format'

export type ReadInvocation =
  | { ok: true; id: string; raw: boolean }
  | { ok: false; message: string }

function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`
}

/** 解析 read 的选项与参数；供命令与测试共用 */
export function resolveReadInvocation(ctx: CommandContext): ReadInvocation {
  const optionError = rejectUnknownOptions('blog', ctx.options, ['--raw'])
  if (optionError) return { ok: false, message: optionError }

  const rawOption = ctx.options['--raw']
  const positional = ctx.args.slice(1)
  if (positional.length > 1) {
    return { ok: false, message: 'blog: 参数过多（一次只能阅读一篇）' }
  }

  let id = positional[0]
  let raw = rawOption === true

  if (typeof rawOption === 'string') {
    if (id !== undefined) {
      return { ok: false, message: 'blog: 参数过多（一次只能阅读一篇）' }
    }
    id = rawOption
    raw = true
  }

  if (id === undefined) {
    return { ok: false, message: 'blog: 缺少文章 id（用法: blog read [--raw] <id>）' }
  }

  return { ok: true, id, raw }
}

export async function runRead(ctx: CommandContext): Promise<void> {
  const invocation = resolveReadInvocation(ctx)
  if (!invocation.ok) return fail(ctx, invocation.message)

  const article = await ctx.dataSource.fetchArticle(invocation.id)
  if (!article) {
    return fail(ctx, `blog: 文章不存在: ${invocation.id}，输入 blog list 查看全部文章`)
  }
  if (article.content.trim() === '') {
    return fail(ctx, `blog: 文章内容为空: ${invocation.id}`)
  }

  if (invocation.raw) {
    ctx.output.write(ensureTrailingNewline(article.content))
    return
  }

  const meta = [article.date ?? '', article.tags?.join(' / ') ?? '']
    .filter((part) => part !== '')
    .join(' · ')

  ctx.output.writeHtml(
    `<article class="md"><div class="md__meta">${escapeHtml(meta)}</div>${renderMarkdown(article.content)}</article>`,
  )
}
