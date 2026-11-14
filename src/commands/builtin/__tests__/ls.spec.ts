import { describe, expect, it } from 'vitest'

import { lsCommand } from '@/commands/builtin/ls'
import { buildTree } from '@/fs/build'
import type { CommandContext } from '@/terminal/context/CommandContext'
import type { OutputChunk } from '@/terminal/context/OutputBuffer'

import { createTestContext } from './helpers'

function run(overrides: Partial<CommandContext> = {}): {
  context: CommandContext
  chunks: OutputChunk[]
} {
  const { context, chunks } = createTestContext(overrides)
  lsCommand.execute(context)
  return { context, chunks }
}

describe('ls 命令', () => {
  it('默认列出 cwd，目录带 / 后缀并隐藏点文件', () => {
    const { chunks } = run()

    expect(chunks).toEqual([{ type: 'text', content: 'notes/\nREADME.md' }])
  })

  it('按中文排序规则升序，并支持目录参数', () => {
    const { chunks } = run({ args: ['/'] })

    expect(chunks).toEqual([{ type: 'text', content: 'home/\nmnt/' }])
  })

  it('支持相对路径、~ 与 ~/子路径', () => {
    expect(run({ cwd: '/home', args: ['guest'] }).chunks).toEqual([
      { type: 'text', content: 'notes/\nREADME.md' },
    ])
    expect(run({ args: ['~'] }).chunks).toEqual([
      { type: 'text', content: 'notes/\nREADME.md' },
    ])
    expect(run({ args: ['~/notes'] }).chunks).toEqual([
      { type: 'text', content: 'welcome.txt' },
    ])
  })

  it('支持文件参数，原样输出参数文本', () => {
    const { chunks } = run({ args: ['README.md'] })

    expect(chunks).toEqual([{ type: 'text', content: 'README.md' }])
  })

  it('ls -a 显示 . / .. 与隐藏文件', () => {
    const { chunks } = run({ options: { '-a': true } })

    expect(chunks).toEqual([
      { type: 'text', content: '.\n..\n.profile\nnotes/\nREADME.md' },
    ])
  })

  it('ls -a 在根目录不显示 ..', () => {
    const { chunks } = run({ args: ['/'], options: { '-a': true } })

    expect(chunks).toEqual([{ type: 'text', content: '.\nhome/\nmnt/' }])
  })

  it('ls -l 输出权限、UTF-8 字节大小与名称', () => {
    const { chunks } = run({ options: { '-l': true } })

    expect(chunks).toEqual([
      {
        type: 'text',
        content:
          'drwxr-xr-x       -  notes/\n-rw-r--r--     363  README.md',
      },
    ])
  })

  it('ls -al 为 . / .. 与隐藏文件输出长格式', () => {
    const { chunks } = run({ options: { '-a': true, '-l': true } })

    expect(chunks).toEqual([
      {
        type: 'text',
        content: [
          'drwxr-xr-x       -  .',
          'drwxr-xr-x       -  ..',
          '-rw-r--r--      84  .profile',
          'drwxr-xr-x       -  notes/',
          '-rw-r--r--     363  README.md',
        ].join('\n'),
      },
    ])
  })

  it('ls -l 支持文件参数并保留参数原文', () => {
    const { chunks } = run({ args: ['notes/welcome.txt'], options: { '-l': true } })

    expect(chunks).toEqual([
      { type: 'text', content: '-rw-r--r--     216  notes/welcome.txt' },
    ])
  })

  it('空目录单参数不输出任何 chunk', () => {
    const { chunks } = run({ args: ['/mnt'] })

    expect(chunks).toEqual([])
  })

  it('多参数含目录时输出表头与块间空行', () => {
    const { chunks } = run({ args: ['/mnt', '/home'] })

    expect(chunks).toEqual([
      { type: 'text', content: '/mnt:' },
      { type: 'text', content: '\n/home:\nguest/' },
    ])
  })

  it('多参数为文件 + 目录时，文件不打表头并保留空行', () => {
    const { chunks } = run({ args: ['README.md', '/mnt'] })

    expect(chunks).toEqual([
      { type: 'text', content: 'README.md' },
      { type: 'text', content: '\n/mnt:' },
    ])
  })

  it('多文件参数连续输出，无表头无空行', () => {
    const { chunks } = run({ args: ['README.md', 'notes/welcome.txt'] })

    expect(chunks).toEqual([
      { type: 'text', content: 'README.md' },
      { type: 'text', content: 'notes/welcome.txt' },
    ])
  })

  it('不存在的路径只报该参数错误，其余参数继续输出', () => {
    const { chunks } = run({ args: ['nope', '/'] })

    expect(chunks).toEqual([
      { type: 'error', content: 'ls: 无法访问 nope: 目录不存在' },
      { type: 'text', content: '/:\nhome/\nmnt/' },
    ])
  })

  it('多参数中的空目录只输出表头', () => {
    const { chunks } = run({ args: ['/mnt', '/'] })

    expect(chunks[0]).toEqual({ type: 'text', content: '/mnt:' })
    expect(chunks[1]).toEqual({ type: 'text', content: '\n/:\nhome/\nmnt/' })
  })

  it('未知选项直接报错且不列目录', () => {
    const { chunks } = run({ args: ['/'], options: { '-R': true } })

    expect(chunks).toEqual([{ type: 'error', content: 'ls: 不支持的选项: -R' }])
  })

  it('~user 与 HOME 缺失给出明确错误', () => {
    expect(run({ args: ['~guest/x'] }).chunks).toEqual([
      { type: 'error', content: 'ls: 不支持 ~user 形式: ~guest/x' },
    ])
    expect(run({ args: ['~'], env: { USER: 'guest' } }).chunks).toEqual([
      { type: 'error', content: 'ls: 无法确定 home 目录（HOME 未设置）' },
    ])
  })

  it('cwd 已失效时按目录不存在报错', () => {
    const { chunks } = run({ cwd: '/missing' })

    expect(chunks).toEqual([
      { type: 'error', content: 'ls: 无法访问 /missing: 目录不存在' },
    ])
  })

  it('挂载树中的隐藏文件默认过滤，-a 显示，显式参数仍可访问', () => {
    const tree = () => buildTree({ visible: 'v', '.hidden': 'h', dir: { dir: {} } })

    const { context, chunks } = createTestContext({ args: ['/mnt/demo'] })
    context.mounts.mount('/mnt/demo', tree())
    lsCommand.execute(context)
    expect(chunks).toEqual([{ type: 'text', content: 'dir/\nvisible' }])

    const showAll = createTestContext({ args: ['/mnt/demo'], options: { '-a': true } })
    showAll.context.mounts.mount('/mnt/demo', tree())
    lsCommand.execute(showAll.context)
    expect(showAll.chunks).toEqual([
      { type: 'text', content: '.\n..\n.hidden\ndir/\nvisible' },
    ])

    const explicit = createTestContext({ args: ['/mnt/demo/.hidden'] })
    explicit.context.mounts.mount('/mnt/demo', tree())
    lsCommand.execute(explicit.context)
    expect(explicit.chunks).toEqual([
      { type: 'text', content: '/mnt/demo/.hidden' },
    ])
  })

  it('数字按自然序排序', () => {
    const { context, chunks } = createTestContext({ args: ['/mnt/demo'] })
    context.mounts.mount(
      '/mnt/demo',
      buildTree({ 'file10.txt': '', 'file2.txt': '', 'a.txt': '' }),
    )

    lsCommand.execute(context)

    expect(chunks).toEqual([{ type: 'text', content: 'a.txt\nfile2.txt\nfile10.txt' }])
  })

  it('只产生 text / error chunk，不产生 html', () => {
    const { chunks } = run({ options: { '-a': true, '-l': true } })

    expect(chunks.every((chunk) => chunk.type === 'text' || chunk.type === 'error')).toBe(
      true,
    )
  })

  it('ls -l 对外部资源（meta.src）显示 -，文本文件仍显示字节数', () => {
    const { context, chunks } = createTestContext({
      args: ['/mnt/gallery'],
      options: { '-l': true },
    })
    context.mounts.mount(
      '/mnt/gallery',
      buildTree({
        'image.png': { file: '', meta: { mime: 'image/png', src: '/assets/image.png' } },
        'note.txt': 'hello',
      }),
    )

    lsCommand.execute(context)

    expect(chunks).toEqual([
      {
        type: 'text',
        content: '-rw-r--r--       -  image.png\n-rw-r--r--       5  note.txt',
      },
    ])
  })
})
