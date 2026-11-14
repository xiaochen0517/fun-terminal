import { describe, expect, it } from 'vitest'

import { complete } from '@/terminal/completion'
import { createDirectoryNode, createFileNode, createVfs } from '@/fs/vfs'
import type { Vfs } from '@/fs/vfs'

const COMMANDS = [
  'blog',
  'cat',
  'cd',
  'clear',
  'echo',
  'help',
  'history',
  'img',
  'ls',
  'mount',
  'pwd',
  'unmount',
]

function makeVfs(): Vfs {
  const root = createDirectoryNode('', [
    createDirectoryNode('home', [
      createDirectoryNode('guest', [
        createFileNode('README.md', ''),
        createDirectoryNode('notes', [createFileNode('welcome.txt', '')]),
        createFileNode('.profile', ''),
      ]),
    ]),
    createDirectoryNode('mnt', [
      createDirectoryNode('blog', [createFileNode('hello.md', '')]),
      createDirectoryNode('demo', []),
      createDirectoryNode('gallery', [createFileNode('a.png', '')]),
    ]),
  ])
  return createVfs({ root })
}

function options(vfs: Vfs, cwd = '/home/guest') {
  return { commands: COMMANDS, cwd, vfs, homeDir: '/home/guest' }
}

describe('complete 命令名补全', () => {
  const vfs = makeVfs()

  it('唯一匹配补全为「命令名 + 空格」', () => {
    expect(complete('ec', options(vfs))).toEqual({ type: 'complete', value: 'echo ' })
  })

  it('多匹配列出候选并补公共前缀', () => {
    expect(complete('c', options(vfs))).toEqual({
      type: 'list',
      value: 'c',
      candidates: ['cat', 'cd', 'clear'],
    })
  })

  it('多匹配补到公共前缀（自定义命令集）', () => {
    const vfs2 = makeVfs()
    expect(complete('i', { ...options(vfs2), commands: ['install', 'instance'] })).toEqual({
      type: 'list',
      value: 'insta',
      candidates: ['install', 'instance'],
    })
  })

  it('无匹配返回 none', () => {
    expect(complete('zz', options(vfs))).toEqual({ type: 'none' })
  })

  it('空输入返回 none', () => {
    expect(complete('', options(vfs))).toEqual({ type: 'none' })
  })
})

describe('complete 路径补全', () => {
  const vfs = makeVfs()

  it('绝对路径唯一匹配补全目录并追加斜杠', () => {
    expect(complete('cat /mnt/b', options(vfs))).toEqual({
      type: 'complete',
      value: 'cat /mnt/blog/',
    })
  })

  it('绝对路径多匹配列出候选（目录带斜杠）', () => {
    expect(complete('cat /mnt/', options(vfs))).toEqual({
      type: 'list',
      value: 'cat /mnt/',
      candidates: ['blog/', 'demo/', 'gallery/'],
    })
  })

  it('相对路径唯一匹配补全', () => {
    expect(complete('cat README', options(vfs))).toEqual({
      type: 'complete',
      value: 'cat README.md',
    })
  })

  it('相对目录唯一匹配补全其子项', () => {
    expect(complete('cat notes/', options(vfs))).toEqual({
      type: 'complete',
      value: 'cat notes/welcome.txt',
    })
  })

  it('~ 展开并列出 home 子项（隐藏文件不列出）', () => {
    expect(complete('cd ~', options(vfs))).toEqual({
      type: 'list',
      value: 'cd ~/',
      candidates: ['notes/', 'README.md'],
    })
  })

  it('名字前缀以 . 开头时列出隐藏文件', () => {
    expect(complete('cat .p', options(vfs))).toEqual({
      type: 'complete',
      value: 'cat .profile',
    })
  })

  it('目录不存在返回 none', () => {
    expect(complete('ls /nonexistent/x', options(vfs))).toEqual({ type: 'none' })
  })

  it('无匹配返回 none', () => {
    expect(complete('ls /mnt/no', options(vfs))).toEqual({ type: 'none' })
  })
})
