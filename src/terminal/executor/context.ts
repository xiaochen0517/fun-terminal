/**
 * 命令上下文构建
 *
 * 执行器在每次执行前调用本函数，把「本次解析结果 + 会话状态 + 输出缓冲」
 * 组装为 CommandContext。命令因此无需接触 Pinia Store 或全局单例（D-01）。
 */

import type { DataSource } from '@/data/DataSource'
import type { MountApi } from '@/fs/mount'
import type { Vfs } from '@/fs/vfs'
import type { Command, CommandContext } from '@/terminal/context/CommandContext'
import type { OutputBuffer } from '@/terminal/context/OutputBuffer'
import type { ParsedCommand } from '@/terminal/parser/CommandParser'

/** 会话侧访问器：把 Store 的响应式状态以最小接口暴露给上下文构建器 */
export interface CommandSessionAccess {
  /** 读取当前 cwd（每次执行时取值，不缓存） */
  getCwd(): string
  /** 读取会话环境变量（构建时浅拷贝） */
  getEnv(): Readonly<Record<string, string>>
  /** 切换 cwd（cd 使用） */
  setCwd(next: string): void
  /** 已注册命令快照（help 使用） */
  getCommands(): readonly Command[]
  /** 会话历史快照（history 使用）；返回 Store 当前数组，构建器负责拷贝 */
  getHistory(): readonly string[]
  /** 数据访问抽象（M2 为占位实现，M7 替换） */
  dataSource: DataSource
  /** 只读 VFS（应用级共享实例） */
  vfs: Vfs
  /** 挂载管理（应用级共享实例） */
  mounts: MountApi
}

/** 上下文构建函数签名 */
export type CommandContextBuilder = (
  parsed: ParsedCommand,
  output: OutputBuffer,
) => CommandContext

/** 创建上下文构建函数 */
export function createCommandContextBuilder(
  access: CommandSessionAccess,
): CommandContextBuilder {
  return (parsed, output) => ({
    args: [...parsed.args],
    options: { ...parsed.options },
    cwd: access.getCwd(),
    env: { ...access.getEnv() },
    dataSource: access.dataSource,
    output,
    commands: access.getCommands(),
    history: [...access.getHistory()],
    setCwd: (next) => access.setCwd(next),
    vfs: access.vfs,
    mounts: access.mounts,
  })
}
