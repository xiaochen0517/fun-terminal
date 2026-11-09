/**
 * 命令契约定义（核心接口）
 *
 * 所有命令（内置命令与业务插件命令）均需遵循本文件定义的接口，
 * 保证命令与终端 UI、解析器、数据层的解耦。
 *
 * 本文件仅定义类型与接口，不包含任何实现逻辑。
 */

import type { DataSource } from '@/data/DataSource'
import type { OutputBuffer } from '@/terminal/context/OutputBuffer'

/** 命令执行上下文：执行命令时注入的运行时信息 */
export interface CommandContext {
  /** 解析后的位置参数（不含命令名本身） */
  args: string[]
  /** 解析后的选项，如 { '-a': true, '--long': true, '--name': 'xxx' } */
  options: Record<string, string | boolean>
  /** 当前虚拟工作目录（绝对路径，基于 VFS） */
  cwd: string
  /** 虚拟环境变量 */
  env: Record<string, string>
  /** 数据访问抽象 */
  dataSource: DataSource
  /** 输出缓冲，命令通过它向终端写内容 */
  output: OutputBuffer
}

/** 命令接口：所有命令需实现的统一契约 */
export interface Command {
  /** 命令名，如 'ls' */
  name: string
  /** 命令说明，供 help 展示（面向访客，使用中文） */
  description: string
  /** 用法示例（可选） */
  usage?: string
  /** 执行命令 */
  execute(ctx: CommandContext): Promise<void> | void
}

export type { CommandContext as default }
