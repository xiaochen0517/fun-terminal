/**
 * 插件装载器（Plugin Loader）
 *
 * 把「安装一个插件」的语义收敛到唯一实现：
 * - 先 await install(api)，成功后再注册插件声明的 commands；
 * - 单个插件失败只记录 console.error 并跳过，不阻断其他插件与终端启动；
 * - installPlugins 永不 reject，作为 runtime.ready 的实现基础。
 */

import type { CommandPlugin, PluginApi } from '@/commands/CommandPlugin'
import type { DataSource } from '@/data/DataSource'
import type { MountApi } from '@/fs/mount'
import type { Vfs } from '@/fs/vfs'
import type { CommandRegistry } from '@/terminal/registry/CommandRegistry'

/** 装载器宿主：注册表 + 三个核心能力 */
export interface PluginApiOptions {
  registry: CommandRegistry
  mounts: MountApi
  vfs: Vfs
  dataSource: DataSource
}

/** 构造 PluginApi（纯组装，不做校验） */
export function createPluginApi(options: PluginApiOptions): PluginApi {
  return {
    registry: options.registry,
    mounts: options.mounts,
    vfs: options.vfs,
    dataSource: options.dataSource,
  }
}

/** 插件日志标签：id 缺省时用固定文案，保证错误可定位 */
function pluginLabel(plugin: CommandPlugin): string {
  const id = plugin.id?.trim()
  return id && id.length > 0 ? id : '<未命名插件>'
}

/**
 * 安装单个插件：先 install，成功后注册 commands。
 * 返回值仅用于测试与诊断；任何异常都被隔离，调用方永远不需要 catch。
 */
export async function installPlugin(api: PluginApi, plugin: CommandPlugin): Promise<boolean> {
  const label = pluginLabel(plugin)
  const commands = plugin.commands ?? []

  if (!plugin.install && commands.length === 0) {
    console.warn(`[fun-terminal] 插件未提供命令或安装逻辑，已跳过: ${label}`)
    return false
  }

  try {
    await plugin.install?.(api)
    if (commands.length > 0) api.registry.registerAll([...commands])
    return true
  } catch (error) {
    console.error(`[fun-terminal] 插件安装失败，已跳过: ${label}`, error)
    return false
  }
}

/** 按数组顺序安装插件；永不 reject */
export async function installPlugins(
  api: PluginApi,
  plugins: readonly CommandPlugin[],
): Promise<void> {
  for (const plugin of plugins) {
    await installPlugin(api, plugin)
  }
}
