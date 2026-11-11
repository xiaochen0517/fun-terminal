/**
 * 运行时装配
 *
 * 按「核心命令 → 插件（按数组顺序）」装配命令注册表：
 * - 核心命令同步注册，因此优先于插件命令（D-02）；
 * - 插件只通过 CommandPlugin 契约接入，新增插件不修改终端核心；
 * - 运行时同时持有应用级文件系统（VFS + 挂载管理），随上下文注入命令（M3）；
 * - 插件按序安装（M6），全部完成后 `ready` resolve，命令执行前 await 它。
 */

import type { CommandPlugin } from '@/commands/CommandPlugin'
import { builtinCommands } from '@/commands/builtin'
import { createPluginApi, installPlugins } from '@/commands/loader'
import { demoPlugin } from '@/commands/plugins/demo'
import { dataSource } from '@/data'
import type { DataSource } from '@/data/DataSource'
import { fileSystem } from '@/fs'
import type { MountApi } from '@/fs/mount'
import type { Vfs } from '@/fs/vfs'
import type { Command } from '@/terminal/context/CommandContext'
import { createCommandRegistry } from '@/terminal/registry/CommandRegistry'
import type { CommandRegistry } from '@/terminal/registry/CommandRegistry'

/** 运行时依赖：随里程碑扩展 */
export interface CommandRuntimeDeps {
  /** 数据访问抽象（M2 为占位实现，M7 替换为 StaticDataSource） */
  dataSource: DataSource
  /** 只读虚拟文件系统 */
  vfs: Vfs
  /** 挂载管理（M6 交给 PluginApi） */
  mounts: MountApi
}

/** 运行时装配选项：在依赖之上追加插件列表 */
export interface CommandRuntimeOptions extends CommandRuntimeDeps {
  /** 按数组顺序安装的插件；缺省为空 */
  plugins?: readonly CommandPlugin[]
}

/** 运行时实例 */
export interface CommandRuntime {
  /** 命令注册表 */
  registry: CommandRegistry
  /** 已注册命令的实时视图（每次访问返回当前注册表内容，help 使用） */
  readonly commands: readonly Command[]
  /** 运行时依赖，Store 构建命令上下文时取用 */
  deps: CommandRuntimeDeps
  /** 插件装载完成信号：按序 await 全部 install 后 resolve，永不 reject */
  readonly ready: Promise<void>
}

/** 创建命令运行时（核心命令 + 插件） */
export function createCommandRuntime(options: CommandRuntimeOptions): CommandRuntime {
  const { dataSource, vfs, mounts, plugins = [] } = options
  const registry = createCommandRegistry()

  // 核心命令同步注册，先于任何插件（D-02）
  registry.registerAll([...builtinCommands])

  const api = createPluginApi({ registry, mounts, vfs, dataSource })
  const ready = installPlugins(api, plugins)

  return {
    registry,
    get commands() {
      return registry.all()
    },
    deps: { dataSource, vfs, mounts },
    ready,
  }
}

/** 当前启用的插件：M6 起为 demo；M8/M9 依次追加 blog / image */
const appPlugins: readonly CommandPlugin[] = [demoPlugin]

/** 应用级单例 */
export const commandRuntime: CommandRuntime = createCommandRuntime({
  dataSource,
  vfs: fileSystem.vfs,
  mounts: fileSystem.mounts,
  plugins: appPlugins,
})
