import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMountManager } from '@/fs/mount'
import type { MountApi } from '@/fs/mount'
import { createDirectoryNode, createFileNode, createVfs } from '@/fs/vfs'
import type { MutableVfs, VfsNode } from '@/fs/vfs'

/** `/` + `/home/guest` + `/mnt`（含 `/mnt/old` 空目录） */
function createTestFs(): { vfs: MutableVfs; mounts: MountApi } {
  const vfs = createVfs({
    root: createDirectoryNode('', [
      createDirectoryNode('home', [createDirectoryNode('guest')]),
      createDirectoryNode('mnt', [createDirectoryNode('old')]),
    ]),
  })
  return { vfs, mounts: createMountManager(vfs) }
}

function createBlogTree(): VfsNode {
  return createDirectoryNode('', [
    createFileNode('hello.md', '# 你好'),
    createDirectoryNode('drafts'),
  ])
}

describe('createMountManager', () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warn.mockRestore()
  })

  it('mounts a tree under /mnt and renames its root', () => {
    const { vfs, mounts } = createTestFs()
    const tree = createBlogTree()

    expect(mounts.mount('/mnt/blog', tree)).toEqual({ ok: true })

    expect(tree.name).toBe('blog')
    expect(tree.parent).toBe(vfs.resolve('/mnt').node)
    expect(vfs.readDir('/mnt/blog')?.map((entry) => entry.name)).toEqual([
      'hello.md',
      'drafts',
    ])
    expect(vfs.readFile('/mnt/blog/hello.md')).toBe('# 你好')
    expect(warn).not.toHaveBeenCalled()
  })

  it('fixes parent pointers of the mounted subtree', () => {
    const { vfs, mounts } = createTestFs()
    const tree = createBlogTree()

    mounts.mount('/mnt/blog', tree)

    const blog = vfs.resolve('/mnt/blog').node!
    const file = vfs.resolve('/mnt/blog/hello.md').node!

    expect(file.parent).toBe(blog)
    expect(blog.parent).toBe(vfs.resolve('/mnt').node)
  })

  it('removes the created node on unmount when the target did not exist', () => {
    const { vfs, mounts } = createTestFs()

    mounts.mount('/mnt/blog', createBlogTree())

    expect(mounts.unmount('/mnt/blog')).toBe(true)
    expect(vfs.resolve('/mnt/blog').node).toBeNull()
    expect(vfs.readDir('/mnt')?.map((entry) => entry.name)).toEqual(['old'])
  })

  it('restores the original node on unmount when the target existed', () => {
    const { vfs, mounts } = createTestFs()
    const original = vfs.resolve('/mnt/old').node!

    mounts.mount('/mnt/old', createBlogTree())
    expect(vfs.readFile('/mnt/old/hello.md')).toBe('# 你好')
    expect(vfs.readDir('/mnt/old')).toHaveLength(2)

    expect(mounts.unmount('/mnt/old')).toBe(true)
    expect(vfs.resolve('/mnt/old').node).toBe(original)
    expect(original.parent).toBe(vfs.resolve('/mnt').node)
    expect(vfs.readDir('/mnt/old')).toEqual([])
  })

  it('makes the tree mountable again after unmount', () => {
    const { mounts } = createTestFs()
    const tree = createBlogTree()

    mounts.mount('/mnt/blog', tree)
    mounts.unmount('/mnt/blog')

    expect(tree.parent).toBeNull()
    expect(mounts.mount('/mnt/blog', tree)).toEqual({ ok: true })
  })

  it('rejects targets outside the /mnt/** whitelist', () => {
    const { mounts } = createTestFs()

    for (const target of ['/', '/mnt', '/home/guest', '/tmp/x', '/mnt/../home']) {
      expect(mounts.mount(target, createDirectoryNode(''))).toEqual({
        ok: false,
        reason: 'invalid-target',
      })
    }
    expect(warn).toHaveBeenCalledTimes(5)
  })

  it('normalizes the target before mounting and listing', () => {
    const { mounts } = createTestFs()

    expect(mounts.mount('/mnt/./blog/', createBlogTree())).toEqual({ ok: true })
    expect(mounts.list().map((point) => point.target)).toEqual(['/mnt/blog'])
  })

  it('allows unicode target names', () => {
    const { mounts } = createTestFs()

    expect(mounts.mount('/mnt/示例', createBlogTree())).toEqual({ ok: true })
    expect(mounts.list().map((point) => point.target)).toEqual(['/mnt/示例'])
  })

  it('rejects a duplicate target and keeps the first mount', () => {
    const { vfs, mounts } = createTestFs()
    const first = createDirectoryNode('', [createFileNode('first.txt', 'first')])

    mounts.mount('/mnt/blog', first)
    const second = createDirectoryNode('', [createFileNode('second.txt', 'second')])

    expect(mounts.mount('/mnt/blog', second)).toEqual({
      ok: false,
      reason: 'duplicate',
    })
    expect(vfs.readFile('/mnt/blog/first.txt')).toBe('first')
    expect(mounts.list()).toHaveLength(1)
  })

  it('rejects nested mounts in both directions', () => {
    const { vfs, mounts } = createTestFs()
    vfs.attachNode('/mnt/a', createDirectoryNode(''))

    mounts.mount('/mnt/a', createDirectoryNode(''))
    expect(mounts.mount('/mnt/a/b', createDirectoryNode(''))).toEqual({
      ok: false,
      reason: 'nested',
    })

    const { vfs: otherVfs, mounts: otherMounts } = createTestFs()
    otherVfs.attachNode('/mnt/a', createDirectoryNode(''))
    otherMounts.mount('/mnt/a/b', createDirectoryNode(''))
    expect(otherMounts.mount('/mnt/a', createDirectoryNode(''))).toEqual({
      ok: false,
      reason: 'nested',
    })
  })

  it('rejects a missing parent directory', () => {
    const { mounts } = createTestFs()

    expect(mounts.mount('/mnt/nope/x', createDirectoryNode(''))).toEqual({
      ok: false,
      reason: 'parent-missing',
    })
  })

  it('rejects a non-directory tree', () => {
    const { mounts } = createTestFs()

    expect(mounts.mount('/mnt/blog', createFileNode(''))).toEqual({
      ok: false,
      reason: 'invalid-tree',
    })
  })

  it('rejects a tree that is already mounted elsewhere', () => {
    const { mounts } = createTestFs()
    const tree = createBlogTree()

    mounts.mount('/mnt/blog', tree)

    expect(mounts.mount('/mnt/gallery', tree)).toEqual({
      ok: false,
      reason: 'invalid-tree',
    })
    expect(mounts.list()).toHaveLength(1)
  })

  it('returns false and warns when unmounting an unknown target', () => {
    const { mounts } = createTestFs()

    expect(mounts.unmount('/mnt/nope')).toBe(false)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('lists mount points in mount order and returns a snapshot', () => {
    const { mounts } = createTestFs()

    mounts.mount('/mnt/a', createDirectoryNode(''))
    mounts.mount('/mnt/b', createDirectoryNode(''))

    const points = [...mounts.list()]
    expect(points.map((point) => point.target)).toEqual(['/mnt/a', '/mnt/b'])

    points.pop()
    expect(mounts.list()).toHaveLength(2)
  })
})
