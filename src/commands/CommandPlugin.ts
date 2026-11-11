/**
 * 命令插件契约（CommandPlugin / PluginApi）
 *
 * 一个插件可提供一组命令，并通过 install() 挂载内容树、注册命令。
 * 内置命令与插件命令遵循同一命令契约，实现命令的即插即用。
 *
 * 装载语义由 `src/commands/loader.ts` 保证：
 * - install 允许同步或异步，核心按数组顺序串行 await；
 * - install 成功后才注册 commands；单插件安装失败只记录日志并跳过；
 * - 插件只能通过 PluginApi 使用核心能力，不得直接访问 Store / 运行时单例。
 */

import type { DataSource } from '@/data/DataSource'
import type { MountApi } from '@/fs/mount'
import type { Vfs } from '@/fs/vfs'
import type { Command } from '@/terminal/context/CommandContext'
import type { CommandRegistry } from '@/terminal/registry/CommandRegistry'

/** 插件安装时获得的核心能力：插件只能通过它使用核心 */
export interface PluginApi {
  /** 注册插件命令（与 commands 字段等效，先注册者优先） */
  registry: CommandRegistry
  /** 挂载/卸载只读内容树 */
  mounts: MountApi
  /** 只读查询虚拟文件系统 */
  vfs: Vfs
  /** 数据访问抽象（M7 起为 StaticDataSource） */
  dataSource: DataSource
}

/** 命令插件接口 */
export interface CommandPlugin {
  /** 插件标识（可选），用于装载日志与冲突诊断 */
  id?: string
  /** 插件提供的命令集合（可选；也可在 install 中注册） */
  commands?: Command[]
  /** 安装钩子：挂载内容树、注册命令；允许同步或异步 */
  install?(api: PluginApi): void | Promise<void>
}
