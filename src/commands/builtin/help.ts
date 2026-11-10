/**
 * help 命令
 *
 * 无参数：按名称升序列出全部已注册命令与说明；
 * help <命令>：展示该命令的说明与用法；
 * 命令不存在：输出错误提示。
 *
 * 数据只来自 ctx.commands，禁止硬编码命令清单。
 */

import type { Command } from '@/terminal/context/CommandContext'

function formatList(commands: readonly Command[]): string {
  const sorted = [...commands].sort((a, b) => a.name.localeCompare(b.name))
  const width = sorted.reduce((max, command) => Math.max(max, command.name.length), 0)
  return sorted
    .map((command) => `${command.name.padEnd(width)}  ${command.description}`)
    .join('\n')
}

export const helpCommand: Command = {
  name: 'help',
  description: '查看可用命令与用法',
  usage: 'help [命令]',
  execute(ctx) {
    const target = ctx.args[0]

    if (target !== undefined) {
      const command = ctx.commands.find((item) => item.name === target)
      if (!command) {
        ctx.output.push({ type: 'error', content: `help: 未找到命令: ${target}` })
        return
      }
      ctx.output.write(
        `${command.name} - ${command.description}\n用法: ${command.usage ?? command.name}`,
      )
      return
    }

    ctx.output.write(formatList(ctx.commands))
  },
}
