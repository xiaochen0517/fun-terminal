/**
 * 运行时装配
 *
 * 按「核心命令 → 插件（按数组顺序）」装配命令注册表：
 * - 核心命令先注册，因此优先于插件命令（D-02）；
 * - 插件只通过 CommandPlugin 契约接入，新增插件不修改终端核心。
 */

import type { CommandPlugin } from '@/commands/CommandPlugin'
import { builtinPlugin } from '@/commands/builtin'
import { dataSource } from '@/data'
import type { DataSource } from '@/data/DataSource'
import type { Command } from '@/terminal/context/CommandContext'
import { createCommandRegistry } from '@/terminal/registry/CommandRegistry'
import type { CommandRegistry } from '@/terminal/registry/CommandRegistry'

/** 运行时依赖：随里程碑扩展（M6 增加插件挂载能力） */
export interface CommandRuntimeDeps {
  /** 数据访问抽象（M2 为占位实现，M7 替换为 StaticDataSource） */
  dataSource: DataSource
}

/** 运行时实例 */
export interface CommandRuntime {
  /** 命令注册表 */
  registry: CommandRegistry
  /** 已安装的命令快照（按注册顺序；help 与测试使用） */
  commands: readonly Command[]
  /** 运行时依赖，Store 构建命令上下文时取用 */
  deps: CommandRuntimeDeps
}

/** 当前启用的插件列表：M6/M8/M9 逐步加入 */
const plugins: readonly CommandPlugin[] = []

/** 安装单个插件：优先使用插件自定义 install，否则注册其全部命令 */
export function installPlugin(registry: CommandRegistry, plugin: CommandPlugin): void {
  if (plugin.install) {
    plugin.install(registry)
    return
  }
  registry.registerAll(plugin.commands)
}

/** 创建命令运行时（核心命令 + 插件） */
export function createCommandRuntime(deps: CommandRuntimeDeps): CommandRuntime {
  const registry = createCommandRegistry()

  installPlugin(registry, builtinPlugin)
  for (const plugin of plugins) {
    installPlugin(registry, plugin)
  }

  return { registry, commands: registry.all(), deps }
}

/** 应用级单例 */
export const commandRuntime: CommandRuntime = createCommandRuntime({ dataSource })
