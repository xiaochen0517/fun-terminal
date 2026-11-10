/**
 * clear 命令
 *
 * 清空终端输出（保留历史）。只通过 ctx.output.clear() 实现，
 * 不 import Store、不操作 DOM；历史由 Store 在提交时记录。
 *
 * 带位置参数或选项时提示「不接受参数」且不清屏。
 */

import type { Command } from '@/terminal/context/CommandContext'

export const clearCommand: Command = {
  name: 'clear',
  description: '清空终端输出（保留历史）',
  usage: 'clear',
  execute(ctx) {
    if (ctx.args.length > 0 || Object.keys(ctx.options).length > 0) {
      ctx.output.push({ type: 'error', content: 'clear: 不接受参数' })
      return
    }
    ctx.output.clear()
  },
}
