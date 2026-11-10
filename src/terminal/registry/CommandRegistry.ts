/**
 * 命令注册表（CommandRegistry）
 *
 * 维护命令名到命令实现的映射，负责命令的注册、查找与分发。
 * 是插件化架构的核心，核心命令与插件命令均通过它统一注册。
 *
 * 冲突策略（D-02，20261110 确认）：命令名唯一，重复注册时输出告警并保留先注册者；
 * 核心命令先于插件注册，因此插件无法覆盖 ls/cd 等核心命令。
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

/** 创建命令注册表 */
export function createCommandRegistry(): CommandRegistry {
  const commands = new Map<string, Command>()

  function register(command: Command) {
    const name = typeof command.name === 'string' ? command.name.trim() : ''

    if (!name || /\s/.test(name)) {
      console.warn('[fun-terminal] 命令名为空或包含空白，已忽略', command.name)
      return
    }

    if (commands.has(name)) {
      console.warn(`[fun-terminal] 命令名冲突，已保留先注册的实现: ${name}`)
      return
    }

    commands.set(name, command)
  }

  return {
    register,
    registerAll(list) {
      for (const command of list) register(command)
    },
    get(name) {
      return commands.get(name)
    },
    has(name) {
      return commands.has(name)
    },
    all() {
      return [...commands.values()]
    },
  }
}
