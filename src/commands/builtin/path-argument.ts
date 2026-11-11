/**
 * 命令参数处理（共享工具）
 *
 * `cd` / `ls` / `cat` 都需要「`~` 展开 + 基于 cwd 解析为绝对路径」，
 * 以及「白名单外的选项一律拒绝」。集中在这里，避免三个命令各复制一套、
 * 逐渐漂移。本模块不 import Store / 组件 / 全局单例，可独立单测。
 */

import { resolve } from '@/fs/path'
import type { CommandContext } from '@/terminal/context/CommandContext'

export type PathArgumentResult =
  | { ok: true; target: string }
  | { ok: false; message: string }

/** 展开 `~` / `~/...`；`~user` 与其他形态明确报错（错误前缀取 command） */
export function expandHomeArgument(
  command: string,
  argument: string,
  env: Record<string, string>,
): PathArgumentResult {
  if (argument !== '~' && !argument.startsWith('~/')) {
    if (argument.startsWith('~')) {
      return { ok: false, message: `${command}: 不支持 ~user 形式: ${argument}` }
    }
    return { ok: true, target: argument }
  }

  const home = env.HOME
  if (!home) {
    return { ok: false, message: `${command}: 无法确定 home 目录（HOME 未设置）` }
  }
  return { ok: true, target: argument === '~' ? home : `${home}${argument.slice(1)}` }
}

/** 展开 `~` 后基于 cwd 解析为绝对路径（不校验存在性，交给 VFS） */
export function resolvePathArgument(
  command: string,
  argument: string,
  ctx: CommandContext,
): PathArgumentResult {
  const expanded = expandHomeArgument(command, argument, ctx.env)
  if (!expanded.ok) return expanded
  return { ok: true, target: resolve(ctx.cwd, expanded.target) }
}

/** 返回错误文案；全部合法时返回 null */
export function rejectUnknownOptions(
  command: string,
  options: Record<string, string | boolean>,
  allowed: readonly string[],
): string | null {
  const unknown = Object.keys(options).filter((key) => !allowed.includes(key))
  return unknown.length > 0 ? `${command}: 不支持的选项: ${unknown.join(' ')}` : null
}
