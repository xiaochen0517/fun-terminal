import { describe, expect, it } from 'vitest'

import { buildTree } from '@/fs/build'
import type { VfsNode } from '@/fs/vfs'

/** 按名字取子节点，缺失即失败（避免测试里堆叠非空断言） */
function child(node: VfsNode, name: string): VfsNode {
  const found = node.children?.find((entry) => entry.name === name)
  if (!found) throw new Error(`缺少子节点: ${name}`)
  return found
}

describe('buildTree', () => {
  it('builds files from plain strings', () => {
    const tree = buildTree({ 'hello.md': '# 你好' })

    expect(tree.type).toBe('directory')
    expect(tree.name).toBe('')
    expect(tree.children).toHaveLength(1)
    expect(tree.children?.[0]).toEqual({
      name: 'hello.md',
      type: 'file',
      parent: tree,
      content: '# 你好',
    })
  })

  it('builds files from { file } entries with meta', () => {
    const tree = buildTree({
      '01.png': { file: '', meta: { mime: 'image/png' } },
    })

    expect(tree.children?.[0]?.content).toBe('')
    expect(tree.children?.[0]?.meta).toEqual({ mime: 'image/png' })
  })

  it('builds nested directories with correct parent pointers', () => {
    const tree = buildTree({
      posts: { dir: { 'a.md': 'A', deep: { dir: { 'b.md': 'B' } } } },
    })

    const posts = child(tree, 'posts')
    const deep = child(posts, 'deep')
    const b = child(deep, 'b.md')

    expect(posts.parent).toBe(tree)
    expect(deep.parent).toBe(posts)
    expect(b.parent).toBe(deep)
    expect(b.content).toBe('B')
  })

  it('supports an empty spec and an empty directory', () => {
    const tree = buildTree({})

    expect(tree.children).toEqual([])
    expect(buildTree({ empty: { dir: {} } }).children?.[0]?.children).toEqual([])
  })

  it('keeps directory meta', () => {
    const tree = buildTree({
      blog: { dir: {}, meta: { source: 'articles' } },
    })

    expect(tree.children?.[0]?.meta).toEqual({ source: 'articles' })
  })

  it('applies root name and meta from options', () => {
    const tree = buildTree({ 'a.md': 'A' }, { name: 'blog', meta: { source: 'blog' } })

    expect(tree.name).toBe('blog')
    expect(tree.meta).toEqual({ source: 'blog' })
  })

  it('supports unicode and emoji names', () => {
    const tree = buildTree({ '你好.md': '你好', '🙂.txt': 'smile' })

    expect(tree.children?.map((child) => child.name)).toEqual(['你好.md', '🙂.txt'])
  })

  it('throws on invalid node names', () => {
    for (const name of ['', 'a/b', 'a\\b', '.', '..']) {
      expect(() => buildTree({ [name]: 'x' })).toThrow('非法节点名')
    }
  })

  it('throws on invalid node shapes', () => {
    expect(() => buildTree({ a: { file: 'x', dir: {} } as never })).toThrow(
      '非法树节点',
    )
    expect(() => buildTree({ a: {} as never })).toThrow('非法树节点')
    expect(() => buildTree({ a: ['x'] as never })).toThrow('非法树节点')
  })

  it('throws on an invalid root name', () => {
    expect(() => buildTree({}, { name: 'a/b' })).toThrow('非法节点名')
    expect(() => buildTree({}, { name: '..' })).toThrow('非法节点名')
  })
})
