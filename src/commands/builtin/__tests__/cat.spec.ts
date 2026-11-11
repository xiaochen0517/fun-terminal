import { describe, expect, it } from 'vitest'

import { catCommand } from '@/commands/builtin/cat'
import { buildTree } from '@/fs/build'
import { HOME_README, HOME_WELCOME } from '@/fs/home-content'
import type { CommandContext } from '@/terminal/context/CommandContext'
import type { OutputChunk } from '@/terminal/context/OutputBuffer'

import { createTestContext } from './helpers'

function run(overrides: Partial<CommandContext> = {}): {
  context: CommandContext
  chunks: OutputChunk[]
} {
  const { context, chunks } = createTestContext(overrides)
  catCommand.execute(context)
  return { context, chunks }
}

function runMounted(
  spec: Parameters<typeof buildTree>[0],
  overrides: Partial<CommandContext> = {},
): OutputChunk[] {
  const { context, chunks } = createTestContext(overrides)
  context.mounts.mount('/mnt/demo', buildTree(spec))
  catCommand.execute(context)
  return chunks
}

describe('cat 命令', () => {
  it('原样输出文本文件内容', () => {
    const { chunks } = run({ args: ['README.md'] })

    expect(chunks).toEqual([{ type: 'text', content: HOME_README }])
  })

  it('文件末尾无换行时补一个换行', () => {
    const chunks = runMounted({ 'a.txt': 'abc' }, { args: ['/mnt/demo/a.txt'] })

    expect(chunks).toEqual([{ type: 'text', content: 'abc\n' }])
  })

  it('已有换行时不重复追加', () => {
    const chunks = runMounted({ 'a.txt': 'abc\n' }, { args: ['/mnt/demo/a.txt'] })

    expect(chunks).toEqual([{ type: 'text', content: 'abc\n' }])
  })

  it('空文件不输出任何 chunk', () => {
    const chunks = runMounted({ 'empty.txt': '' }, { args: ['/mnt/demo/empty.txt'] })

    expect(chunks).toEqual([])
  })

  it('目录与不存在的文件给出错误', () => {
    expect(run({ args: ['/home/guest'] }).chunks).toEqual([
      { type: 'error', content: 'cat: /home/guest: 是一个目录' },
    ])
    expect(run({ args: ['nope'] }).chunks).toEqual([
      { type: 'error', content: 'cat: nope: 文件不存在' },
    ])
  })

  it('多文件按参数顺序连续输出', () => {
    const { chunks } = run({ args: ['README.md', 'notes/welcome.txt'] })

    expect(chunks).toEqual([
      { type: 'text', content: HOME_README },
      { type: 'text', content: HOME_WELCOME },
    ])
  })

  it('中间文件失败时错误插在对应位置，前后文件仍输出', () => {
    const { chunks } = run({ args: ['README.md', 'nope', 'notes/welcome.txt'] })

    expect(chunks).toEqual([
      { type: 'text', content: HOME_README },
      { type: 'error', content: 'cat: nope: 文件不存在' },
      { type: 'text', content: HOME_WELCOME },
    ])
  })

  it('cat -n 为每行加 6 位行号与制表符，空行也编号', () => {
    const chunks = runMounted(
      { 'a.txt': 'a\n\nb' },
      { args: ['/mnt/demo/a.txt'], options: { '-n': true } },
    )

    expect(chunks).toEqual([{ type: 'text', content: '     1\ta\n     2\t\n     3\tb\n' }])
  })

  it('cat -n 多文件连续编号', () => {
    const chunks = runMounted(
      { 'x.txt': 'x\n', 'y.txt': 'y' },
      { args: ['/mnt/demo/x.txt', '/mnt/demo/y.txt'], options: { '-n': true } },
    )

    expect(chunks).toEqual([
      { type: 'text', content: '     1\tx\n' },
      { type: 'text', content: '     2\ty\n' },
    ])
  })

  it('cat -n 空文件不推进行号', () => {
    const chunks = runMounted(
      { 'x.txt': 'x\n', 'empty.txt': '', 'y.txt': 'y' },
      {
        args: ['/mnt/demo/x.txt', '/mnt/demo/empty.txt', '/mnt/demo/y.txt'],
        options: { '-n': true },
      },
    )

    expect(chunks).toEqual([
      { type: 'text', content: '     1\tx\n' },
      { type: 'text', content: '     2\ty\n' },
    ])
  })

  it('按 meta.mime 识别图片与二进制', () => {
    const chunks = runMounted(
      {
        cover: { file: 'x', meta: { mime: 'image/png' } },
        data: { file: 'x', meta: { mime: 'application/pdf' } },
      },
      { args: ['/mnt/demo/cover', '/mnt/demo/data'] },
    )

    expect(chunks).toEqual([
      {
        type: 'error',
        content: 'cat: /mnt/demo/cover: 图片文件无法以文本方式显示，请使用 img 查看',
      },
      {
        type: 'error',
        content: 'cat: /mnt/demo/data: 二进制文件，无法以文本方式显示',
      },
    ])
  })

  it('无 mime 时按扩展名识别图片与二进制', () => {
    const chunks = runMounted(
      { 'cover.png': 'x', 'data.bin': 'x' },
      { args: ['/mnt/demo/cover.png', '/mnt/demo/data.bin'] },
    )

    expect(chunks).toEqual([
      {
        type: 'error',
        content: 'cat: /mnt/demo/cover.png: 图片文件无法以文本方式显示，请使用 img 查看',
      },
      {
        type: 'error',
        content: 'cat: /mnt/demo/data.bin: 二进制文件，无法以文本方式显示',
      },
    ])
  })

  it('无 mime / 扩展名时按 NUL 字节识别二进制', () => {
    const chunks = runMounted(
      { data: 'a\0b', 'notes.md': 'a\0b' },
      { args: ['/mnt/demo/data', '/mnt/demo/notes.md'] },
    )

    expect(chunks).toEqual([
      {
        type: 'error',
        content: 'cat: /mnt/demo/data: 二进制文件，无法以文本方式显示',
      },
      {
        type: 'error',
        content: 'cat: /mnt/demo/notes.md: 二进制文件，无法以文本方式显示',
      },
    ])
  })

  it('文本 mime 与文本扩展名按文本读取', () => {
    const chunks = runMounted(
      {
        data: { file: 'hi', meta: { mime: 'text/plain' } },
        'notes.md': '# hi',
      },
      { args: ['/mnt/demo/data', '/mnt/demo/notes.md'] },
    )

    expect(chunks).toEqual([
      { type: 'text', content: 'hi\n' },
      { type: 'text', content: '# hi\n' },
    ])
  })

  it('超过 200 KB 直接拒绝，等于阈值允许', () => {
    const rejected = runMounted(
      { 'big.txt': 'a'.repeat(204801) },
      { args: ['/mnt/demo/big.txt'] },
    )
    expect(rejected).toEqual([
      {
        type: 'error',
        content: 'cat: /mnt/demo/big.txt: 文件过大（超过 200 KB），无法显示',
      },
    ])

    const accepted = runMounted(
      { 'big.txt': 'a'.repeat(204800) },
      { args: ['/mnt/demo/big.txt'] },
    )
    expect(accepted).toHaveLength(1)
    expect(accepted[0]?.type).toBe('text')
    expect(accepted[0]?.type === 'text' ? accepted[0].content.length : 0).toBe(204801)
  })

  it('无参数与未知选项给出明确错误', () => {
    expect(run().chunks).toEqual([
      {
        type: 'error',
        content: 'cat: 缺少文件参数（用法: cat [-n] <文件...>）',
      },
    ])
    expect(run({ options: { '-A': true } }).chunks).toEqual([
      { type: 'error', content: 'cat: 不支持的选项: -A' },
    ])
  })

  it('支持 ~、相对路径与 ~user 报错', () => {
    expect(run({ args: ['~/README.md'] }).chunks).toEqual([
      { type: 'text', content: HOME_README },
    ])
    expect(
      run({ cwd: '/home/guest/notes', args: ['welcome.txt'] }).chunks,
    ).toEqual([{ type: 'text', content: HOME_WELCOME }])
    expect(run({ args: ['~guest/x'] }).chunks).toEqual([
      { type: 'error', content: 'cat: 不支持 ~user 形式: ~guest/x' },
    ])
  })

  it('HOME 缺失时给出明确错误', () => {
    expect(run({ args: ['~'], env: { USER: 'guest' } }).chunks).toEqual([
      { type: 'error', content: 'cat: 无法确定 home 目录（HOME 未设置）' },
    ])
  })

  it('cat -n README 从第 1 行开始编号', () => {
    const { chunks } = run({ args: ['README.md'], options: { '-n': true } })
    const content = chunks[0]?.type === 'text' ? chunks[0].content : ''

    expect(content.startsWith('     1\t# fun-terminal\n')).toBe(true)
    expect(content.endsWith('\n')).toBe(true)
  })

  it('只产生 text / error chunk，不产生 html', () => {
    const { chunks } = run({ args: ['README.md', 'nope'] })

    expect(chunks.every((chunk) => chunk.type === 'text' || chunk.type === 'error')).toBe(
      true,
    )
  })
})
