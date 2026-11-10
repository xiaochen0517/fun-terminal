/**
 * 挂载点管理（MountApi）
 *
 * 把只读子树挂到 VFS 的 `/mnt/**` 下（如 `/mnt/blog`），卸载时恢复原节点。
 * 核心命令与插件命令共用同一套挂载语义；插件只能提交只读子树，
 * 挂载写入（`attachNode` / `detachNode`）由本模块独占调用。
 *
 * 契约见 docs/demands/20261110-02-虚拟文件系统与挂载.md 第 3.4 节：
 * - 白名单：仅 `/mnt` 下至少一级子目录，允许中文等 Unicode 名称；
 * - 一期禁止嵌套挂载（父子挂载互斥）；
 * - 失败返回原因码（不抛错），并 `console.warn` 便于开发定位。
 */

import { dirname, normalize } from '@/fs/path'
import type { MutableVfs, VfsNode } from '@/fs/vfs'

/** 挂载点描述 */
export interface MountPoint {
  /** 规范化后的挂载目标，如 /mnt/blog */
  target: string
  /** 挂载的子树根节点（目录） */
  node: VfsNode
}

/** 挂载失败原因（供 mount 命令给出可读错误） */
export type MountFailReason =
  | 'invalid-target'
  | 'parent-missing'
  | 'invalid-tree'
  | 'duplicate'
  | 'nested'

/** 挂载结果 */
export type MountResult = { ok: true } | { ok: false; reason: MountFailReason }

/** 挂载管理能力：命令与插件通过 ctx.mounts / api.mounts 使用 */
export interface MountApi {
  /** 把只读子树挂到 target（覆盖目标节点，unmount 后恢复） */
  mount(target: string, tree: VfsNode): MountResult
  /** 卸载并恢复 target 原节点；未挂载返回 false */
  unmount(target: string): boolean
  /** 当前挂载点列表（按挂载顺序） */
  list(): readonly MountPoint[]
}

/** 挂载点白名单：`/mnt` 下至少一级子目录 */
const MOUNT_TARGET_PATTERN = /^\/mnt(\/[^/]+)+$/

/** 内部挂载记录：previous 用于卸载时恢复原节点 */
interface MountRecord {
  target: string
  node: VfsNode
  previous: VfsNode | null
}

function warnInvalidTarget(target: string): MountResult {
  console.warn(`[fun-terminal] 挂载点非法，仅允许 /mnt/** 下至少一级子目录: ${target}`)
  return { ok: false, reason: 'invalid-target' }
}

function warnParentMissing(target: string): MountResult {
  console.warn(`[fun-terminal] 挂载父目录不存在或不是目录: ${target}`)
  return { ok: false, reason: 'parent-missing' }
}

function warnInvalidTree(target: string): MountResult {
  console.warn(`[fun-terminal] 挂载树必须是未挂载的目录节点: ${target}`)
  return { ok: false, reason: 'invalid-tree' }
}

function warnDuplicate(target: string): MountResult {
  console.warn(`[fun-terminal] 挂载点重复，已保留先挂载者: ${target}`)
  return { ok: false, reason: 'duplicate' }
}

function warnNested(target: string, existing: string): MountResult {
  console.warn(`[fun-terminal] 不支持嵌套挂载: ${target}（已有挂载点 ${existing}）`)
  return { ok: false, reason: 'nested' }
}

/** 查找与新目标构成父子关系的既有挂载点 */
function findNestedTarget(targets: Iterable<string>, target: string): string | null {
  for (const existing of targets) {
    if (target.startsWith(`${existing}/`) || existing.startsWith(`${target}/`)) {
      return existing
    }
  }
  return null
}

/** 创建挂载管理器；内部直接修改传入的 MutableVfs */
export function createMountManager(vfs: MutableVfs): MountApi {
  const records = new Map<string, MountRecord>()

  function mount(target: string, tree: VfsNode): MountResult {
    const normalized = normalize(target)
    if (!MOUNT_TARGET_PATTERN.test(normalized)) return warnInvalidTarget(normalized)

    const parent = vfs.resolve(dirname(normalized)).node
    if (!parent || parent.type !== 'directory') return warnParentMissing(normalized)

    if (tree.type !== 'directory' || tree.parent !== null) {
      return warnInvalidTree(normalized)
    }

    if (records.has(normalized)) return warnDuplicate(normalized)

    const nested = findNestedTarget(records.keys(), normalized)
    if (nested) return warnNested(normalized, nested)

    const previous = vfs.attachNode(normalized, tree)
    records.set(normalized, { target: normalized, node: tree, previous })
    return { ok: true }
  }

  function unmount(target: string): boolean {
    const normalized = normalize(target)
    const record = records.get(normalized)
    if (!record) {
      console.warn(`[fun-terminal] 挂载点不存在: ${normalized}`)
      return false
    }

    if (record.previous) {
      vfs.attachNode(normalized, record.previous)
    } else {
      vfs.detachNode(normalized)
    }
    records.delete(normalized)
    return true
  }

  function list(): readonly MountPoint[] {
    return [...records.values()].map(({ target, node }) => ({ target, node }))
  }

  return { mount, unmount, list }
}
