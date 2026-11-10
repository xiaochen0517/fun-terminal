import { describe, expect, it, vi } from 'vitest'

import {
  createDirectoryNode,
  createFileNode,
  createVfs,
} from '@/fs/vfs'
import type { VfsNode } from '@/fs/vfs'

/** `/` + `/home/guest` + `/mnt/a.md` 的最小树 */
function createSampleTree(): VfsNode {
  return createDirectoryNode('', [
    createDirectoryNode('home', [createDirectoryNode('guest')]),
    createDirectoryNode('mnt', [createFileNode('hello.md', '# 你好')]),
  ])
}

describe('createDirectoryNode', () => {
  it('creates a directory node with an empty children array', () => {
    const node = createDirectoryNode('mnt')

    expect(node).toEqual({
      name: 'mnt',
      type: 'directory',
      parent: null,
      children: [],
    })
  })

  it('attaches children and fixes their parent pointers', () => {
    const file = createFileNode('a.md', 'content')
    const node = createDirectoryNode('blog', [file])

    expect(node.children).toEqual([file])
    expect(file.parent).toBe(node)
  })

  it('keeps optional meta', () => {
    const node = createDirectoryNode('blog', [], { mime: 'inode/directory' })

    expect(node.meta).toEqual({ mime: 'inode/directory' })
    expect(createDirectoryNode('plain').meta).toBeUndefined()
  })
})

describe('createFileNode', () => {
  it('defaults content to an empty string', () => {
    expect(createFileNode('a.md')).toEqual({
      name: 'a.md',
      type: 'file',
      parent: null,
      content: '',
    })
  })

  it('keeps content and meta', () => {
    const node = createFileNode('01.png', '', { mime: 'image/png' })

    expect(node.content).toBe('')
    expect(node.meta).toEqual({ mime: 'image/png' })
  })
})

describe('createVfs', () => {
  it('creates an empty directory root by default', () => {
    const vfs = createVfs()

    expect(vfs.root.parent).toBeNull()
    expect(vfs.root.name).toBe('')
    expect(vfs.root.type).toBe('directory')
    expect(vfs.readDir('/')).toEqual([])
  })

  it('rejects a non-directory root', () => {
    expect(() => createVfs({ root: createFileNode('') })).toThrow('VFS 根节点必须是目录')
  })

  it('clears the parent pointer of a provided root', () => {
    const root = createSampleTree()
    const vfs = createVfs({ root })

    expect(vfs.root.parent).toBeNull()
  })
})

describe('resolve', () => {
  it('resolves the root', () => {
    const vfs = createVfs({ root: createSampleTree() })

    expect(vfs.resolve('/')).toEqual({ node: vfs.root, path: '/' })
  })

  it('resolves nested directories and files with normalized paths', () => {
    const vfs = createVfs({ root: createSampleTree() })

    const home = vfs.resolve('/home/guest')
    expect(home.path).toBe('/home/guest')
    expect(home.node?.name).toBe('guest')
    expect(home.node?.parent?.name).toBe('home')
    expect(home.node?.parent?.parent).toBe(vfs.root)

    const file = vfs.resolve('/mnt/./hello.md/')
    expect(file.path).toBe('/mnt/hello.md')
    expect(file.node?.type).toBe('file')
  })

  it('returns a null node for missing paths', () => {
    const vfs = createVfs({ root: createSampleTree() })

    expect(vfs.resolve('/nope')).toEqual({ node: null, path: '/nope' })
    expect(vfs.resolve('/home/nope/deep').node).toBeNull()
  })

  it('fails when an intermediate segment is a file', () => {
    const vfs = createVfs({ root: createSampleTree() })

    expect(vfs.resolve('/mnt/hello.md/x')).toEqual({
      node: null,
      path: '/mnt/hello.md/x',
    })
  })

  it('warns and resolves relative paths against the root', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const vfs = createVfs({ root: createSampleTree() })

    try {
      const result = vfs.resolve('mnt/hello.md')

      expect(result.path).toBe('/mnt/hello.md')
      expect(result.node?.name).toBe('hello.md')
      expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })
})

describe('exists', () => {
  it('reports whether a path exists', () => {
    const vfs = createVfs({ root: createSampleTree() })

    expect(vfs.exists('/')).toBe(true)
    expect(vfs.exists('/mnt/hello.md')).toBe(true)
    expect(vfs.exists('/mnt')).toBe(true)
    expect(vfs.exists('/mnt/nope')).toBe(false)
  })
})

describe('readDir', () => {
  it('returns a copy of the children in insertion order', () => {
    const vfs = createVfs({ root: createSampleTree() })
    const entries = vfs.readDir('/')!

    expect(entries.map((entry) => entry.name)).toEqual(['home', 'mnt'])

    entries.pop()
    expect(vfs.readDir('/')?.map((entry) => entry.name)).toEqual(['home', 'mnt'])
  })

  it('returns null for files and missing paths', () => {
    const vfs = createVfs({ root: createSampleTree() })

    expect(vfs.readDir('/mnt/hello.md')).toBeNull()
    expect(vfs.readDir('/nope')).toBeNull()
  })
})

describe('readFile', () => {
  it('returns file content', () => {
    const vfs = createVfs({ root: createSampleTree() })

    expect(vfs.readFile('/mnt/hello.md')).toBe('# 你好')
  })

  it('returns an empty string when content is missing', () => {
    const root = createDirectoryNode('', [
      { name: 'empty.txt', type: 'file', parent: null },
    ])
    const vfs = createVfs({ root })

    expect(vfs.readFile('/empty.txt')).toBe('')
  })

  it('returns null for directories and missing paths', () => {
    const vfs = createVfs({ root: createSampleTree() })

    expect(vfs.readFile('/mnt')).toBeNull()
    expect(vfs.readFile('/nope')).toBeNull()
  })
})

describe('attachNode', () => {
  it('appends a new child and fixes name and parent', () => {
    const vfs = createVfs({ root: createSampleTree() })
    const node = createDirectoryNode('')

    const previous = vfs.attachNode('/mnt/blog', node)

    expect(previous).toBeNull()
    expect(node.name).toBe('blog')
    expect(node.parent).toBe(vfs.resolve('/mnt').node)
    expect(vfs.readDir('/mnt')?.map((entry) => entry.name)).toEqual([
      'hello.md',
      'blog',
    ])
  })

  it('replaces an existing child in place and detaches the old node', () => {
    const vfs = createVfs({ root: createSampleTree() })
    const mounted = createDirectoryNode('')

    const previous = vfs.attachNode('/mnt/hello.md', mounted)

    expect(previous?.name).toBe('hello.md')
    expect(previous?.parent).toBeNull()
    expect(vfs.readDir('/mnt')?.map((entry) => entry.name)).toEqual(['hello.md'])
    expect(vfs.readDir('/mnt/hello.md')).toEqual([])
  })

  it('throws on the root and on a missing parent', () => {
    const vfs = createVfs({ root: createSampleTree() })

    expect(() => vfs.attachNode('/', createDirectoryNode(''))).toThrow(
      '根节点不可被替换',
    )
    expect(() => vfs.attachNode('/nope/x', createDirectoryNode(''))).toThrow(
      '挂载父目录不存在或不是目录',
    )
  })
})

describe('detachNode', () => {
  it('removes a child and clears its parent pointer', () => {
    const vfs = createVfs({ root: createSampleTree() })

    const removed = vfs.detachNode('/mnt/hello.md')

    expect(removed?.name).toBe('hello.md')
    expect(removed?.parent).toBeNull()
    expect(vfs.readDir('/mnt')).toEqual([])
  })

  it('returns null for a missing child', () => {
    const vfs = createVfs({ root: createSampleTree() })

    expect(vfs.detachNode('/mnt/nope')).toBeNull()
  })

  it('throws on the root', () => {
    const vfs = createVfs({ root: createSampleTree() })

    expect(() => vfs.detachNode('/')).toThrow('根节点不可被移除')
  })
})
