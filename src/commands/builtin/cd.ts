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

type ExpandResult = { ok: true; value: string } | { ok: false; message: string }

/** 展开 home 前缀：仅支持 `~` 与 `~/...`；`~user` 明确不支持 */
function expandHomeArgument(arg: string, env: Record<string, string>): ExpandResult {
  if (arg !== '~' && !arg.startsWith('~/')) {
    if (arg.startsWith('~')) {
      return { ok: false, message: `cd: 不支持 ~user 形式: ${arg}` }
    }
    return { ok: true, value: arg }
  }

  const home = env.HOME
  if (!home) {
    return { ok: false, message: 'cd: 无法确定 home 目录（HOME 未设置）' }
  }
  return { ok: true, value: arg === '~' ? home : `${home}${arg.slice(1)}` }
}

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

    const expanded = expandHomeArgument(argument, ctx.env)
    if (!expanded.ok) {
      fail(ctx, expanded.message)
      return
    }

    const target = resolve(ctx.cwd, expanded.value)
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
