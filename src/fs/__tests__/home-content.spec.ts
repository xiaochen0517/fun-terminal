import { describe, expect, it } from 'vitest'

import { createHomeContent, HOME_PROFILE, HOME_README, HOME_WELCOME } from '@/fs/home-content'
import type { VfsNode } from '@/fs/vfs'

function child(nodes: readonly VfsNode[], name: string): VfsNode {
  const found = nodes.find((node) => node.name === name)
  if (!found) throw new Error(`缺少节点: ${name}`)
  return found
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength
}

describe('createHomeContent', () => {
  it('creates README.md, notes/welcome.txt and the hidden .profile', () => {
    const nodes = createHomeContent()

    expect(nodes.map((node) => node.name)).toEqual(['README.md', 'notes', '.profile'])

    const readme = child(nodes, 'README.md')
    expect(readme.type).toBe('file')
    expect(readme.content).toBe(HOME_README)

    const notes = child(nodes, 'notes')
    expect(notes.type).toBe('directory')
    const welcome = child(notes.children ?? [], 'welcome.txt')
    expect(welcome.type).toBe('file')
    expect(welcome.content).toBe(HOME_WELCOME)

    const profile = child(nodes, '.profile')
    expect(profile.type).toBe('file')
    expect(profile.content).toBe(HOME_PROFILE)
  })

  it('keeps the documented UTF-8 sizes used by the demo and ls -l tests', () => {
    expect(byteLength(HOME_README)).toBe(363)
    expect(byteLength(HOME_WELCOME)).toBe(216)
    expect(byteLength(HOME_PROFILE)).toBe(84)
  })

  it('contains no NUL bytes, so cat treats the samples as text', () => {
    expect(HOME_README.includes('\0')).toBe(false)
    expect(HOME_WELCOME.includes('\0')).toBe(false)
    expect(HOME_PROFILE.includes('\0')).toBe(false)
  })

  it('returns fresh nodes on every call', () => {
    const first = createHomeContent()
    const second = createHomeContent()

    const firstReadme = child(first, 'README.md')
    const secondReadme = child(second, 'README.md')

    expect(firstReadme).not.toBe(secondReadme)
    expect(firstReadme.parent).toBeNull()
    expect(secondReadme.parent).toBeNull()
    expect(first).not.toBe(second)
  })
})
