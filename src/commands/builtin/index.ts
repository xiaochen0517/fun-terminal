/**
 * 核心命令注册入口
 *
 * 核心命令：echo / help / clear（M2）、pwd / cd / history（M4）。
 * M5 追加 ls / cat，M6 起的插件命令不在此注册。
 */

import type { Command } from '@/terminal/context/CommandContext'
import type { CommandPlugin } from '@/commands/CommandPlugin'

import { cdCommand } from './cd'
import { clearCommand } from './clear'
import { echoCommand } from './echo'
import { helpCommand } from './help'
import { historyCommand } from './history'
import { pwdCommand } from './pwd'

export const builtinCommands: readonly Command[] = [
  echoCommand,
  helpCommand,
  clearCommand,
  pwdCommand,
  cdCommand,
  historyCommand,
]

/** 核心命令插件：装配时最先安装，因此优先于任何插件命令 */
export const builtinPlugin: CommandPlugin = {
  id: 'builtin',
  commands: [...builtinCommands],
}
