/**
 * 核心命令注册入口
 *
 * 核心命令：echo / help / clear（M2）、pwd / cd / history（M4）、ls / cat（M5）。
 * M6 起的插件命令不在此注册。
 */

import type { Command } from '@/terminal/context/CommandContext'
import type { CommandPlugin } from '@/commands/CommandPlugin'

import { catCommand } from './cat'
import { cdCommand } from './cd'
import { clearCommand } from './clear'
import { echoCommand } from './echo'
import { helpCommand } from './help'
import { historyCommand } from './history'
import { lsCommand } from './ls'
import { pwdCommand } from './pwd'

export const builtinCommands: readonly Command[] = [
  echoCommand,
  helpCommand,
  clearCommand,
  pwdCommand,
  cdCommand,
  historyCommand,
  lsCommand,
  catCommand,
]

/** 核心命令插件：装配时最先安装，因此优先于任何插件命令 */
export const builtinPlugin: CommandPlugin = {
  id: 'builtin',
  commands: [...builtinCommands],
}
