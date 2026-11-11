/**
 * mount 命令（示例插件）
 *
 * 演示插件命令如何通过 `ctx.mounts` 在运行时挂载内容：
 * - 无参数：列出现有挂载点（只读查询，不改状态）；
 * - 参数为目标：仅支持示例插件的 `/mnt/demo`，其余目标给出明确错误；
 * - 已挂载时先经 `list()` 预检，避免 MountApi 对重复目标的告警噪音。
 *
 * 真正保证「不重复 / 不嵌套 / 目标合法」的仍是核心 `MountApi`；
 * 命令内的目标判断只用于生成更准确的访客文案。
 */

import { rejectUnknownOptions, resolvePathArgument } from '@/commands/path-argument'
import type { MountFailReason } from '@/fs/mount'
import type { Command, CommandContext } from '@/terminal/context/CommandContext'

import { DEMO_MOUNT_TARGET, createDemoTree } from './tree'

const REASON_TEXT: Record<MountFailReason, string> = {
  'invalid-target': '挂载点非法',
  'parent-missing': '父目录不存在',
  'invalid-tree': '内容树无效',
  duplicate: '目标已挂载',
  nested: '与已有挂载点构成嵌套',
}

function fail(ctx: CommandContext, message: string): void {
  ctx.output.push({ type: 'error', content: message })
}

function isUnderMnt(target: string): boolean {
  return target.startsWith('/mnt/')
}

function formatMountList(ctx: CommandContext): string {
  const points = ctx.mounts.list()
  if (points.length === 0) return '当前没有挂载点。'
  return [
    `已挂载的目录（${points.length}）：`,
    ...points.map(({ target }) => `  ${target}`),
  ].join('\n')
}

export const mountCommand: Command = {
  name: 'mount',
  description: '挂载示例内容（仅 /mnt/demo）',
  usage: 'mount [挂载点]',
  execute(ctx) {
    const optionError = rejectUnknownOptions('mount', ctx.options, [])
    if (optionError) {
      fail(ctx, optionError)
      return
    }

    if (ctx.args.length === 0) {
      ctx.output.write(formatMountList(ctx))
      return
    }
    if (ctx.args.length > 1) {
      fail(ctx, 'mount: 参数过多（一次只能挂载一个目录）')
      return
    }

    const argument = ctx.args[0]!
    const resolved = resolvePathArgument('mount', argument, ctx)
    if (!resolved.ok) {
      fail(ctx, resolved.message)
      return
    }

    if (resolved.target !== DEMO_MOUNT_TARGET) {
      fail(
        ctx,
        isUnderMnt(resolved.target)
          ? `mount: 示例插件没有该挂载点的内容: ${argument}（当前仅提供 ${DEMO_MOUNT_TARGET}）`
          : `mount: 挂载点非法: ${argument}（仅支持 /mnt 下的子目录）`,
      )
      return
    }

    if (ctx.mounts.list().some((point) => point.target === DEMO_MOUNT_TARGET)) {
      fail(ctx, `mount: ${DEMO_MOUNT_TARGET} 已挂载`)
      return
    }

    const result = ctx.mounts.mount(DEMO_MOUNT_TARGET, createDemoTree())
    if (result.ok) {
      ctx.output.write(`已挂载: ${DEMO_MOUNT_TARGET}`)
      return
    }
    if (result.reason === 'duplicate') {
      // 防御分支：正常路径已在上面预检 list()
      fail(ctx, `mount: ${DEMO_MOUNT_TARGET} 已挂载`)
      return
    }
    fail(ctx, `mount: 挂载失败: ${DEMO_MOUNT_TARGET}（${REASON_TEXT[result.reason]}）`)
  },
}
