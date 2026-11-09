/**
 * 挂载点管理（mount）
 *
 * 将站点内静态内容目录映射到 VFS 的虚拟路径（如 /mnt）。
 * 目录插件通过挂载点暴露站点内容供命令读取。
 *
 * 本文件仅定义类型与接口，具体实现留待功能开发阶段。
 */

import type { Vfs, VfsNode } from '@/fs/vfs'

/** 单个挂载点描述 */
export interface MountPoint {
  /** 虚拟挂载路径，如 /mnt */
  target: string
  /** 挂载来源标识（如站内静态目录名），供实现映射到具体内容 */
  source: string
  /** 挂载的根节点 */
  node: VfsNode
}

/** 挂载管理器接口 */
export interface MountManager {
  /** 挂载一个节点到指定虚拟路径 */
  mount(target: string, source: string, node: VfsNode): void
  /** 卸载指定虚拟路径的挂载点 */
  unmount(target: string): void
  /** 获取所有挂载点 */
  list(): readonly MountPoint[]
  /** 将挂载点应用到 VFS 实例 */
  apply(vfs: Vfs): void
}
