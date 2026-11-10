import { describe, expect, it } from 'vitest'

import { siteConfig } from '@/config/site'
import { buildTree } from '@/fs/build'
import { createFileSystem, createInitialTree, fileSystem } from '@/fs/index'
import type { VfsNode } from '@/fs/vfs'

/** 按名字取子节点，缺失即失败（避免测试里堆叠非空断言） */
function child(node: VfsNode, name: string): VfsNode {
  const found = node.children?.find((entry) => entry.name === name)
  if (!found) throw new Error(`缺少子节点: ${name}`)
  return found
}

describe('createInitialTree', () => {
  it('creates /, the home directory chain and /mnt', () => {
    const root = createInitialTree('/home/guest')

    expect(root.name).toBe('')
    expect(root.parent).toBeNull()
    expect(root.children?.map((child) => child.name)).toEqual(['home', 'mnt'])

    const home = child(root, 'home')
    const guest = child(home, 'guest')
    const mnt = child(root, 'mnt')

    expect(home.parent).toBe(root)
    expect(guest.name).toBe('guest')
    expect(guest.parent).toBe(home)
    expect(mnt.type).toBe('directory')
    expect(mnt.children).toEqual([])
    expect(mnt.parent).toBe(root)
  })

  it('supports a single-level home directory', () => {
    const root = createInitialTree('/root')

    expect(root.children?.map((child) => child.name)).toEqual(['root', 'mnt'])
    expect(root.children?.[0]?.children).toEqual([])
  })

  it('normalizes the home path', () => {
    const root = createInitialTree('/home/team/alice/')

    expect(root.children?.[0]?.children?.[0]?.children?.[0]?.name).toBe('alice')
  })

  it('rejects the root path and paths under /mnt', () => {
    expect(() => createInitialTree('/')).toThrow('非法 home 目录')
    expect(() => createInitialTree('')).toThrow('非法 home 目录')
    expect(() => createInitialTree('/mnt/guest')).toThrow('非法 home 目录')
  })
})

describe('createFileSystem', () => {
  it('defaults the home directory to the site config', () => {
    const { vfs } = createFileSystem()

    expect(vfs.resolve(siteConfig.homeDir).node?.type).toBe('directory')
    expect(vfs.readDir('/mnt')).toEqual([])
  })

  it('accepts a custom home directory', () => {
    const { vfs } = createFileSystem({ homeDir: '/home/tester' })

    expect(vfs.exists('/home/tester')).toBe(true)
    expect(vfs.exists('/home/guest')).toBe(false)
  })

  it('exposes the mount api bound to the same tree', () => {
    const { vfs, mounts } = createFileSystem()

    mounts.mount('/mnt/blog', buildTree({ 'a.md': 'A' }))

    expect(vfs.readFile('/mnt/blog/a.md')).toBe('A')
    expect(mounts.list().map((point) => point.target)).toEqual(['/mnt/blog'])
  })

  it('isolates mounts between instances', () => {
    const first = createFileSystem()
    const second = createFileSystem()

    first.mounts.mount('/mnt/blog', buildTree({ 'a.md': 'A' }))

    expect(first.vfs.readFile('/mnt/blog/a.md')).toBe('A')
    expect(second.vfs.resolve('/mnt/blog').node).toBeNull()
    expect(second.mounts.list()).toEqual([])
  })
})

describe('fileSystem singleton', () => {
  it('is ready with the default tree', () => {
    expect(fileSystem.vfs.resolve(siteConfig.homeDir).node?.type).toBe('directory')
    expect(fileSystem.vfs.resolve('/mnt').node?.type).toBe('directory')
    expect(fileSystem.vfs.readDir('/mnt')).toEqual([])
    expect(fileSystem.mounts.list().length).toBeGreaterThanOrEqual(0)
  })
})
