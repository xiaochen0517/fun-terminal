/**
 * 静态树构建器
 *
 * 把「普通对象描述」递归转换为只读 VFS 子树，供内容插件（M6/M8/M9）在 `install`
 * 阶段构造挂载树时复用，避免每个插件各写一套节点拼装代码。
 *
 * 形态约定：
 * - 字符串 → 文件，值即正文；
 * - `{ file, meta? }` → 文件；
 * - `{ dir, meta? }` → 目录，`dir` 为下一层描述。
 *
 * 非法节点名或非法形态属构建期配置错误，直接抛错；插件装载器（M6）会隔离
 * 单个插件 `install` 的异常，不影响终端启动。
 */

import { createDirectoryNode, createFileNode } from '@/fs/vfs'
import type { VfsNode } from '@/fs/vfs'

/** 目录子项描述：键为节点名，值为文件或目录 */
export type TreeSpec = Record<string, TreeEntry>

/** 单个节点描述 */
export type TreeEntry =
  | string
  | { file: string; meta?: Record<string, string> }
  | { dir: TreeSpec; meta?: Record<string, string> }

/** 构建选项：根节点名（缺省空串，挂载时由目标路径重命名）与根元信息 */
export interface BuildTreeOptions {
  name?: string
  meta?: Record<string, string>
}

/** 校验节点名：非空、非 `.`/`..`、不含路径分隔符 */
function assertValidName(name: string): void {
  if (name === '') throw new Error('非法节点名: 不能为空')
  if (name === '.' || name === '..') throw new Error(`非法节点名: ${name}`)
  if (name.includes('/') || name.includes('\\')) {
    throw new Error(`非法节点名（不能包含路径分隔符）: ${name}`)
  }
}

function buildEntry(name: string, entry: TreeEntry): VfsNode {
  assertValidName(name)

  if (typeof entry === 'string') return createFileNode(name, entry)
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    throw new Error(`非法树节点（必须含 file 或 dir）: ${name}`)
  }

  const hasFile = 'file' in entry
  const hasDir = 'dir' in entry
  if (hasFile === hasDir) {
    throw new Error(`非法树节点（必须且只能含 file 或 dir）: ${name}`)
  }

  if (hasDir) {
    const { dir, meta } = entry as { dir: TreeSpec; meta?: Record<string, string> }
    const children = Object.entries(dir ?? {}).map(([childName, child]) =>
      buildEntry(childName, child),
    )
    return createDirectoryNode(name, children, meta)
  }

  const { file, meta } = entry as { file: string; meta?: Record<string, string> }
  return createFileNode(name, file, meta)
}

/** 由普通对象描述构建只读子树（根节点为目录） */
export function buildTree(spec: TreeSpec, options: BuildTreeOptions = {}): VfsNode {
  if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) {
    throw new Error('非法树描述: 必须是普通对象')
  }

  const name = options.name ?? ''
  if (name !== '') assertValidName(name)

  const children = Object.entries(spec).map(([childName, child]) =>
    buildEntry(childName, child),
  )
  return createDirectoryNode(name, children, options.meta)
}
