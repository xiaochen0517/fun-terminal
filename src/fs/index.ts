/**
 * 文件系统装配
 *
 * 组装应用级只读 VFS 与挂载管理器：
 * - 初始树包含 `/`、会话 home（默认 `/home/guest`）与空目录 `/mnt`；
 * - `/mnt` 的具体内容由插件在装配阶段通过 MountApi 挂载（M6/M8/M9）；
 * - 对外只暴露只读 `Vfs`，可变写入能力止步于本模块（`MutableVfs` 不外传）。
 *
 * 单例仅用于应用装配；测试请用 `createFileSystem()` 新建实例，
 * 避免挂载表（可变状态）在用例之间互相污染。
 */

import { siteConfig } from '@/config/site'
import { createMountManager } from '@/fs/mount'
import type { MountApi } from '@/fs/mount'
import { normalize } from '@/fs/path'
import { createDirectoryNode, createVfs } from '@/fs/vfs'
import type { Vfs, VfsNode } from '@/fs/vfs'

/** 文件系统装配选项 */
export interface FileSystemOptions {
  /** 会话 home 目录，必须是绝对路径且不为 `/`；缺省取站点配置 */
  homeDir?: string
}

/** 文件系统：只读 VFS + 挂载管理 */
export interface FileSystem {
  /** 只读 VFS：注入 CommandContext / PluginApi */
  vfs: Vfs
  /** 挂载管理：注入 CommandContext / PluginApi */
  mounts: MountApi
}

/** 由 homeDir 生成初始树：`/` + `/home/<user...>` + `/mnt` */
export function createInitialTree(homeDir: string): VfsNode {
  const segments = normalize(homeDir).split('/').filter(Boolean)

  if (segments.length === 0) {
    throw new Error('非法 home 目录: 不能是根路径')
  }
  if (segments[0] === 'mnt') {
    throw new Error(`非法 home 目录: 不能位于 /mnt 下: ${homeDir}`)
  }

  let home = createDirectoryNode(segments[segments.length - 1]!)
  for (let index = segments.length - 2; index >= 0; index -= 1) {
    home = createDirectoryNode(segments[index]!, [home])
  }

  return createDirectoryNode('', [home, createDirectoryNode('mnt')])
}

/** 创建独立的文件系统实例（VFS + 挂载管理器绑定同一棵树） */
export function createFileSystem(options: FileSystemOptions = {}): FileSystem {
  const homeDir = options.homeDir ?? siteConfig.homeDir
  const vfs = createVfs({ root: createInitialTree(homeDir) })
  const mounts = createMountManager(vfs)
  return { vfs, mounts }
}

/** 应用级单例：home 取站点配置 */
export const fileSystem: FileSystem = createFileSystem({ homeDir: siteConfig.homeDir })
