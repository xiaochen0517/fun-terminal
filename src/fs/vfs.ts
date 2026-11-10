/**
 * 虚拟文件系统（VFS）——节点模型、查询与核心内部写入
 *
 * 命令层面向 VFS 接口操作虚拟路径，而非直接访问真实文件路径。
 * 站点静态内容被挂载到 VFS（如 /mnt），供 ls、cat、cd 等命令统一读取。
 *
 * 一期仅支持站内静态内容的虚拟映射，只读，不涉及访客本地磁盘读取。
 *
 * 能力边界：
 * - `Vfs` 是公开只读契约，命令与插件只能看到它（CommandContext.vfs / PluginApi.vfs）；
 * - `MutableVfs` 是核心内部契约，只交给 `MountManager` 使用，不对外暴露，
 *   因此命令与插件无法绕过挂载白名单直接改树。
 */

import { basename, dirname, isAbsolute, normalize } from '@/fs/path'

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

/** 虚拟文件系统接口（只读，命令与插件可见） */
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

/**
 * 核心内部可变契约：仅 `MountManager` 使用。
 *
 * 前置条件由调用方（挂载管理器）保证；违反前置条件属编程错误，实现直接抛错。
 */
export interface MutableVfs extends Vfs {
  /** 把 node 挂到 path（父目录必须已存在）；返回被替换的旧节点，无则 null */
  attachNode(path: string, node: VfsNode): VfsNode | null
  /** 从 path 摘除节点并返回；不存在返回 null */
  detachNode(path: string): VfsNode | null
}

/** 创建目录节点；传入 children 时同时修正其 parent 指针 */
export function createDirectoryNode(
  name: string,
  children: readonly VfsNode[] = [],
  meta?: Record<string, string>,
): VfsNode {
  const node: VfsNode = { name, type: 'directory', parent: null, children: [] }
  if (meta) node.meta = meta
  for (const child of children) {
    child.parent = node
    node.children!.push(child)
  }
  return node
}

/** 创建文件节点；content 缺省为空串 */
export function createFileNode(
  name: string,
  content = '',
  meta?: Record<string, string>,
): VfsNode {
  const node: VfsNode = { name, type: 'file', parent: null, content }
  if (meta) node.meta = meta
  return node
}

/** 创建 VFS 实例（缺省根为空目录，名为空串，与 basename('/') 一致） */
export function createVfs(options: { root?: VfsNode } = {}): MutableVfs {
  const root = options.root ?? createDirectoryNode('')
  root.parent = null
  if (root.type !== 'directory') {
    throw new Error('VFS 根节点必须是目录')
  }

  function resolveInput(path: string): string {
    if (!isAbsolute(path)) {
      console.warn('[fun-terminal] VFS 路径必须为绝对路径，已按根解析:', path)
    }
    return normalize(path)
  }

  function resolve(path: string): VfsResolveResult {
    const normalized = resolveInput(path)
    if (normalized === '/') return { node: root, path: normalized }

    let current = root
    for (const segment of normalized.split('/').filter(Boolean)) {
      if (current.type !== 'directory') return { node: null, path: normalized }
      const next = current.children?.find((child) => child.name === segment)
      if (!next) return { node: null, path: normalized }
      current = next
    }
    return { node: current, path: normalized }
  }

  function exists(path: string): boolean {
    return resolve(path).node !== null
  }

  function readDir(path: string): VfsNode[] | null {
    const { node } = resolve(path)
    if (!node || node.type !== 'directory') return null
    return [...(node.children ?? [])]
  }

  function readFile(path: string): string | null {
    const { node } = resolve(path)
    if (!node || node.type !== 'file') return null
    return node.content ?? ''
  }

  function attachNode(path: string, node: VfsNode): VfsNode | null {
    const normalized = resolveInput(path)
    if (normalized === '/') throw new Error('根节点不可被替换')

    const parent = resolve(dirname(normalized)).node
    if (!parent || parent.type !== 'directory') {
      throw new Error(`挂载父目录不存在或不是目录: ${normalized}`)
    }

    const name = basename(normalized)
    node.name = name
    node.parent = parent

    const children = parent.children ?? (parent.children = [])
    const index = children.findIndex((child) => child.name === name)
    if (index === -1) {
      children.push(node)
      return null
    }

    const previous = children[index]!
    children[index] = node
    previous.parent = null
    return previous
  }

  function detachNode(path: string): VfsNode | null {
    const normalized = resolveInput(path)
    if (normalized === '/') throw new Error('根节点不可被移除')

    const parent = resolve(dirname(normalized)).node
    if (!parent || parent.type !== 'directory') {
      throw new Error(`挂载父目录不存在或不是目录: ${normalized}`)
    }

    const name = basename(normalized)
    const children = parent.children ?? []
    const index = children.findIndex((child) => child.name === name)
    if (index === -1) return null

    const [removed] = children.splice(index, 1)
    if (!removed) return null
    removed.parent = null
    return removed
  }

  return { root, resolve, exists, readDir, readFile, attachNode, detachNode }
}
