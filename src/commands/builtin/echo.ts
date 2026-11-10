/**
 * echo 命令
 *
 * 输出位置参数，以单个空格连接；无参数时输出空行。
 * 选项（如 -n）不进入输出，一期不实现 -n/-e。
 */

import type { Command } from '@/terminal/context/CommandContext'

export const echoCommand: Command = {
  name: 'echo',
  description: '输出传入的文本',
  usage: 'echo <文本...>',
  execute(ctx) {
    ctx.output.write(ctx.args.join(' '))
  },
}
