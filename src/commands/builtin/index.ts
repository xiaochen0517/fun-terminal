/**
 * 核心命令注册入口
 *
 * 首批核心命令：echo / help / clear（M2）。
 * M4 追加 history / pwd / cd，M5 追加 ls / cat。
 */

import type { Command } from '@/terminal/context/CommandContext'
import type { CommandPlugin } from '@/commands/CommandPlugin'

import { clearCommand } from './clear'
import { echoCommand } from './echo'
import { helpCommand } from './help'

export const builtinCommands: readonly Command[] = [echoCommand, helpCommand, clearCommand]

/** 核心命令插件：装配时最先安装，因此优先于任何插件命令 */
export const builtinPlugin: CommandPlugin = {
  id: 'builtin',
  commands: [...builtinCommands],
}
