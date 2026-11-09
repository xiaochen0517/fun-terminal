/**
 * 命令插件契约（CommandPlugin）
 *
 * 一个插件可提供一组命令，并通过 install() 注册到命令注册表。
 * 内置命令与外置插件命令均遵循本契约，实现命令的即插即用。
 *
 * 本文件仅定义接口，具体实现留待功能开发阶段。
 */

import type { Command } from '@/terminal/context/CommandContext'
import type { CommandRegistry } from '@/terminal/registry/CommandRegistry'

/** 命令插件接口 */
export interface CommandPlugin {
  /** 插件标识（可选），用于日志与冲突诊断 */
  id?: string
  /** 该插件提供的命令集合 */
  commands: Command[]
  /** 安装钩子：将命令注册到注册表（可选，默认注册 commands 全部命令） */
  install?(registry: CommandRegistry): void
}
