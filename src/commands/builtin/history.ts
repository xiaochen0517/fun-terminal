/**
 * history 命令
 *
 * 输出带序号的会话命令历史（`ctx.history` 快照）。
 * 序号从 1 起、按 max(4, 位数) 右对齐；历史为空时不输出任何内容。
 * 数据只来自上下文，命令不接触 Store。
 */

import type { Command } from '@/terminal/context/CommandContext'

const INDEX_MIN_WIDTH = 4

export const historyCommand: Command = {
  name: 'history',
  description: '查看命令历史',
  usage: 'history',
  execute(ctx) {
    if (ctx.args.length > 0 || Object.keys(ctx.options).length > 0) {
      ctx.output.push({ type: 'error', content: 'history: 不接受参数' })
      return
    }

    const entries = ctx.history
    if (entries.length === 0) return

    const width = Math.max(INDEX_MIN_WIDTH, String(entries.length).length)
    const lines = entries.map(
      (entry, index) => `${String(index + 1).padStart(width)}  ${entry}`,
    )
    ctx.output.write(lines.join('\n'))
  },
}
