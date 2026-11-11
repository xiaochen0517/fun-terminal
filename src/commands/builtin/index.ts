/**
 * 核心命令注册入口
 *
 * 核心命令：echo / help / clear（M2）、pwd / cd / history（M4）、ls / cat（M5）。
 * 由 `createCommandRuntime` 同步注册，先于任何插件（D-02）；M6 起的插件命令
 * 通过 `CommandPlugin` / `PluginApi` 注册，不在此登记。
 */

import type { Command } from '@/terminal/context/CommandContext'

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
