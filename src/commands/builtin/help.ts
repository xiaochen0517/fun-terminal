/**
 * help 命令
 *
 * 无参数：表头 + 按名称升序的两列清单（命令名列宽动态）+ 页脚；
 * help <命令>：展示该命令的说明与用法（usage 缺省时回退为命令名）；
 * 命令不存在：输出错误并提示查看全部命令。
 *
 * 数据只来自 ctx.commands，禁止硬编码命令清单；M6 起自动包含插件命令。
 */

import type { Command } from '@/terminal/context/CommandContext'

const HELP_FOOTER = '输入 help <命令> 查看具体用法。'

function formatList(commands: readonly Command[]): string {
  const sorted = [...commands].sort((a, b) => a.name.localeCompare(b.name))
  const width = sorted.reduce((max, command) => Math.max(max, command.name.length), 0)
  const lines = sorted.map(
    (command) => `  ${command.name.padEnd(width)}  ${command.description}`,
  )

  return [`可用命令（共 ${sorted.length} 条）：`, '', ...lines, '', HELP_FOOTER].join(
    '\n',
  )
}

export const helpCommand: Command = {
  name: 'help',
  description: '查看可用命令与用法',
  usage: 'help [命令]',
  execute(ctx) {
    const optionKeys = Object.keys(ctx.options)
    if (optionKeys.length > 0) {
      ctx.output.push({
        type: 'error',
        content: `help: 不支持的选项: ${optionKeys.join(' ')}`,
      })
      return
    }

    if (ctx.args.length > 1) {
      ctx.output.push({ type: 'error', content: 'help: 参数过多（一次只能查询一个命令）' })
      return
    }

    const target = ctx.args[0]
    if (target === undefined) {
      ctx.output.write(formatList(ctx.commands))
      return
    }

    const command = ctx.commands.find((item) => item.name === target)
    if (!command) {
      ctx.output.push({
        type: 'error',
        content: `help: 未找到命令: ${target}，输入 help 查看全部命令`,
      })
      return
    }

    ctx.output.write(
      `${command.name} - ${command.description}\n用法: ${command.usage ?? command.name}`,
    )
  },
}
