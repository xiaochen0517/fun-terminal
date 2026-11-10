/**
 * pwd 命令
 *
 * 输出当前虚拟工作目录（`ctx.cwd`）。
 * Store 的 cwd 只由初始值与 cd 传入的规范路径写入，因此这里不做二次规范化；
 * 不接受参数与选项，也不校验路径当前是否仍存在（挂载点卸载后的 cwd 仍原样显示）。
 */

import type { Command } from '@/terminal/context/CommandContext'

export const pwdCommand: Command = {
  name: 'pwd',
  description: '显示当前工作目录',
  usage: 'pwd',
  execute(ctx) {
    if (ctx.args.length > 0 || Object.keys(ctx.options).length > 0) {
      ctx.output.push({ type: 'error', content: 'pwd: 不接受参数' })
      return
    }
    ctx.output.write(ctx.cwd)
  },
}
