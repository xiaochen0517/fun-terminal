/**
 * cd 命令
 *
 * 处理顺序：选项 → 参数个数 → `cd -` → `~` 展开 → 路径解析 → 目录校验 → setCwd。
 * 成功时完全静默；失败时输出错误且不改变会话目录。
 *
 * 路径语义完全交给 `@/fs/path` 的 resolve 与 VFS，命令内不复写规则；
 * `~` 展开必须发生在 resolve 之前（path 层不展开 `~`）。
 */

import { resolve } from '@/fs/path'
import type { Command, CommandContext } from '@/terminal/context/CommandContext'

import { expandHomeArgument } from './path-argument'

function fail(ctx: CommandContext, message: string) {
  ctx.output.push({ type: 'error', content: message })
}

export const cdCommand: Command = {
  name: 'cd',
  description: '切换当前工作目录',
  usage: 'cd [目录]',
  execute(ctx) {
    const optionKeys = Object.keys(ctx.options)
    if (optionKeys.length > 0) {
      fail(ctx, `cd: 不支持的选项: ${optionKeys.join(' ')}`)
      return
    }

    if (ctx.args.length > 1) {
      fail(ctx, 'cd: 参数过多（一次只能进入一个目录）')
      return
    }

    // 无参数等价于 cd ~；显式空字符串按 resolve 语义等于当前目录
    const argument = ctx.args[0] ?? '~'

    if (argument === '-') {
      fail(ctx, 'cd: 不支持 cd -（返回上一次目录）')
      return
    }

    const expanded = expandHomeArgument('cd', argument, ctx.env)
    if (!expanded.ok) {
      fail(ctx, expanded.message)
      return
    }

    const target = resolve(ctx.cwd, expanded.target)
    const { node } = ctx.vfs.resolve(target)

    if (!node) {
      fail(ctx, `cd: 目录不存在: ${argument}`)
      return
    }

    if (node.type !== 'directory') {
      fail(ctx, `cd: 不是目录: ${argument}`)
      return
    }

    ctx.setCwd(target)
  },
}
