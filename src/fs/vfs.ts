/**
 * 虚拟文件系统（VFS）——节点模型与路径解析
 *
 * 命令层面向 VFS 接口操作虚拟路径，而非直接访问真实文件路径。
 * 站点静态内容被挂载到 VFS（如 /mnt），供 ls、cat、cd 等命令统一读写。
 *
 * 一期仅支持站内静态内容的虚拟映射，不涉及访客本地磁盘读取。
 *
 * 本文件仅定义类型与接口，具体实现留待功能开发阶段。
 */

/** 文件系统节点类型 */
export type VfsNodeType = 'directory' | 'file'

/** 文件系统节点 */
export interface VfsNode {
  /** 节点名（不含路径） */
  name: string
  /** 节点类型 */
  type: VfsNodeType
  /** 父节点引用（根节点为 null） */
  parent: VfsNode | null
  /** 子节点（仅目录节点有效） */
  children?: VfsNode[]
  /** 文件内容（仅文件节点有效，可选） */
  content?: string
  /** 文件元信息（可选，如 mime 类型，供图片查看插件使用） */
  meta?: Record<string, string>
}

/** 路径解析结果 */
export interface VfsResolveResult {
  /** 解析到的节点，不存在为 null */
  node: VfsNode | null
  /** 规范化后的绝对路径 */
  path: string
}

/** 虚拟文件系统接口 */
export interface Vfs {
  /** 根节点 */
  readonly root: VfsNode
  /** 解析绝对路径，返回节点与规范化路径 */
  resolve(path: string): VfsResolveResult
  /** 判断路径是否存在 */
  exists(path: string): boolean
  /** 读取目录子节点列表（目录不存在返回 null） */
  readDir(path: string): VfsNode[] | null
  /** 读取文件内容（文件不存在或为目录返回 null） */
  readFile(path: string): string | null
}
