/**
 * 命令注册表（CommandRegistry）
 *
 * 维护命令名到命令实现的映射，负责命令的注册、查找与分发。
 * 是插件化架构的核心，内置命令与外置插件命令均通过它统一注册。
 *
 * 本文件仅定义接口，具体实现留待功能开发阶段。
 */

import type { Command } from '@/terminal/context/CommandContext'

/** 命令注册表接口 */
export interface CommandRegistry {
  /** 注册一个命令；若命令名已存在，行为由实现决定（覆盖或告警） */
  register(command: Command): void
  /** 批量注册多个命令 */
  registerAll(commands: Command[]): void
  /** 按命令名查找命令，未找到返回 undefined */
  get(name: string): Command | undefined
  /** 判断命令是否已注册 */
  has(name: string): boolean
  /** 获取所有已注册命令 */
  all(): readonly Command[]
}
