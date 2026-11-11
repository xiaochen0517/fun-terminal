/**
 * unmount 命令（示例插件）
 *
 * 只卸载示例插件的 `/mnt/demo`：其他 `/mnt/**` 挂载点可能属于 M8/M9 的内容，
 * 一期不允许访客卸载它们。卸载成功且 `cwd` 位于该路径下时，不自动改写会话
 * 目录（与 M4/M5 约定一致），只追加一条 system 提示。
 */

import { rejectUnknownOptions, resolvePathArgument } from '@/commands/path-argument'
import type { Command, CommandContext } from '@/terminal/context/CommandContext'

import { DEMO_MOUNT_TARGET } from './tree'

function fail(ctx: CommandContext, message: string): void {
  ctx.output.push({ type: 'error', content: message })
}

function isAtOrUnder(path: string, target: string): boolean {
  return path === target || path.startsWith(`${target}/`)
}

export const unmountCommand: Command = {
  name: 'unmount',
  description: '卸载示例挂载点（仅 /mnt/demo）',
  usage: 'unmount <挂载点>',
  execute(ctx) {
    const optionError = rejectUnknownOptions('unmount', ctx.options, [])
    if (optionError) {
      fail(ctx, optionError)
      return
    }

    if (ctx.args.length === 0) {
      fail(ctx, 'unmount: 缺少挂载点（用法: unmount <挂载点>）')
      return
    }
    if (ctx.args.length > 1) {
      fail(ctx, 'unmount: 参数过多（一次只能卸载一个目录）')
      return
    }

    const argument = ctx.args[0]!
    const resolved = resolvePathArgument('unmount', argument, ctx)
    if (!resolved.ok) {
      fail(ctx, resolved.message)
      return
    }

    if (resolved.target !== DEMO_MOUNT_TARGET) {
      fail(
        ctx,
        resolved.target.startsWith('/mnt/')
          ? `unmount: 示例插件只管理 ${DEMO_MOUNT_TARGET}，无法卸载: ${argument}`
          : `unmount: 挂载点非法: ${argument}（仅支持 /mnt 下的子目录）`,
      )
      return
    }

    if (!ctx.mounts.list().some((point) => point.target === DEMO_MOUNT_TARGET)) {
      fail(ctx, `unmount: ${DEMO_MOUNT_TARGET} 未挂载`)
      return
    }

    if (!ctx.mounts.unmount(DEMO_MOUNT_TARGET)) {
      fail(ctx, `unmount: 卸载失败: ${DEMO_MOUNT_TARGET}`)
      return
    }

    ctx.output.write(`已卸载: ${DEMO_MOUNT_TARGET}`)
    if (isAtOrUnder(ctx.cwd, DEMO_MOUNT_TARGET)) {
      ctx.output.push({
        type: 'system',
        content: '提示：当前目录位于已卸载的挂载点内，请使用 cd 切换到其他目录。',
      })
    }
  },
}
