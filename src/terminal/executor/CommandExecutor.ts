/**
 * 命令执行器（CommandExecutor）
 *
 * 负责「解析 → 查找 → 构建上下文 → 执行 → 兜底」的完整链路：
 * - 未知命令输出错误块，不打断会话；
 * - 命令同步抛错或 Promise reject 统一兜底为 `命令名: 内部错误：<原因>`；
 * - 内部串行队列保证连续提交时输出顺序与提交顺序一致；
 * - execute() 返回的 Promise 永不 reject，调用方无需额外 catch。
 */

import type { CommandContext } from '@/terminal/context/CommandContext'
import type { OutputBuffer } from '@/terminal/context/OutputBuffer'
import type { CommandParser, ParsedCommand } from '@/terminal/parser/CommandParser'
import type { CommandRegistry } from '@/terminal/registry/CommandRegistry'

import { formatInternalError, formatUnknownCommand } from '@/terminal/executor/messages'

/** 命令执行器接口 */
export interface CommandExecutor {
  /** 解析并执行一条原始命令；Promise 在该命令（含排队等待）结束后 resolve，永不 reject */
  execute(raw: string): Promise<void>
}

/** 执行器依赖 */
export interface CommandExecutorOptions {
  /** 命令注册表 */
  registry: CommandRegistry
  /** 命令解析器 */
  parser: CommandParser
  /** 输出缓冲（命令与执行器共用） */
  output: OutputBuffer
  /** 上下文构建函数（命令与测试共用） */
  buildContext(parsed: ParsedCommand, output: OutputBuffer): CommandContext
}

/** 创建命令执行器 */
export function createCommandExecutor(options: CommandExecutorOptions): CommandExecutor {
  let tail: Promise<void> = Promise.resolve()

  async function runOnce(raw: string): Promise<void> {
    const input = raw.trim()
    if (!input) return

    const { parser, registry, output, buildContext } = options

    let parsed: ParsedCommand
    try {
      parsed = parser.parse(input)
    } catch (error) {
      console.error('[fun-terminal] 命令解析失败', error)
      output.push({ type: 'error', content: formatInternalError('命令解析', error) })
      return
    }

    const command = registry.get(parsed.name)
    if (!command) {
      output.push({ type: 'error', content: formatUnknownCommand(parsed.name) })
      return
    }

    const context = buildContext(parsed, output)

    try {
      await command.execute(context)
    } catch (error) {
      console.error('[fun-terminal] 命令执行失败', command.name, error)
      output.push({
        type: 'error',
        content: formatInternalError(command.name, error),
      })
    }
  }

  return {
    execute(raw: string): Promise<void> {
      // 前一条失败也不阻断后续命令；runOnce 已捕获全部异常
      const task = tail.then(
        () => runOnce(raw),
        () => runOnce(raw),
      )
      tail = task
      return task
    },
  }
}
