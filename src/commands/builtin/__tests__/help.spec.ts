import { describe, expect, it } from 'vitest'

import { helpCommand } from '@/commands/builtin/help'
import { siteConfig } from '@/config/site'
import type { Command } from '@/terminal/context/CommandContext'

import { createTestContext } from './helpers'

const HEADER = `${siteConfig.hostname} v${siteConfig.version}`

function createCommand(name: string, description: string, usage?: string): Command {
  return { name, description, usage, execute() {} }
}

function textOf(chunks: ReturnType<typeof createTestContext>['chunks']): string {
  const chunk = chunks[0]
  return chunk?.type === 'text' ? chunk.content : ''
}

describe('help 命令', () => {
  it('按名称升序列出全部命令，带表头与页脚', () => {
    const commands = [
      createCommand('help', '查看可用命令', 'help [命令]'),
      createCommand('echo', '输出传入的文本', 'echo <文本...>'),
      createCommand('clear', '清空终端输出'),
    ]
    const { context, chunks } = createTestContext({ commands })

    helpCommand.execute(context)

    expect(chunks).toHaveLength(1)
    expect(textOf(chunks).split('\n')).toEqual([
      HEADER,
      '',
      '可用命令（共 3 条）：',
      '',
      '  clear  清空终端输出',
      '  echo   输出传入的文本',
      '  help   查看可用命令',
      '',
      '输入 help <命令> 查看具体用法。',
    ])
  })

  it('命令名列宽按最长名称对齐', () => {
    const commands = [
      createCommand('ls', '列出目录'),
      createCommand('cat', '读取文件'),
    ]
    const { context, chunks } = createTestContext({ commands })

    helpCommand.execute(context)

    const lines = textOf(chunks).split('\n')
    expect(lines[4]).toBe('  cat  读取文件')
    expect(lines[5]).toBe('  ls   列出目录')
  })

  it('空命令列表只有表头与页脚', () => {
    const { context, chunks } = createTestContext({ commands: [] })

    helpCommand.execute(context)

    expect(textOf(chunks).split('\n')).toEqual([
      HEADER,
      '',
      '可用命令（共 0 条）：',
      '',
      '',
      '输入 help <命令> 查看具体用法。',
    ])
  })

  it('展示单个命令的说明与用法', () => {
    const commands = [createCommand('echo', '输出传入的文本', 'echo <文本...>')]
    const { context, chunks } = createTestContext({ args: ['echo'], commands })

    helpCommand.execute(context)

    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toEqual({
      type: 'text',
      content: 'echo - 输出传入的文本\n用法: echo <文本...>',
    })
  })

  it('usage 缺省时回退为命令名', () => {
    const commands = [createCommand('clear', '清空终端输出')]
    const { context, chunks } = createTestContext({ args: ['clear'], commands })

    helpCommand.execute(context)

    expect(textOf(chunks)).toContain('用法: clear')
  })

  it('未知命令给出错误与提示', () => {
    const { context, chunks } = createTestContext({
      args: ['nope'],
      commands: [createCommand('echo', '输出文本')],
    })

    helpCommand.execute(context)

    expect(chunks).toEqual([
      {
        type: 'error',
        content: 'help: 未找到命令: nope，输入 help 查看全部命令',
      },
    ])
  })

  it('参数过多时报错', () => {
    const { context, chunks } = createTestContext({
      args: ['echo', 'pwd'],
      commands: [createCommand('echo', '输出文本')],
    })

    helpCommand.execute(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'help: 参数过多（一次只能查询一个命令）' },
    ])
  })

  it('拒绝选项', () => {
    const { context, chunks } = createTestContext({ options: { '--all': true } })

    helpCommand.execute(context)

    expect(chunks).toEqual([{ type: 'error', content: 'help: 不支持的选项: --all' }])
  })

  it('清单来自 ctx.commands 而非硬编码', () => {
    const { context, chunks } = createTestContext({
      commands: [createCommand('brand-new', '新注册命令')],
    })

    helpCommand.execute(context)

    const content = textOf(chunks)
    expect(content).toContain('brand-new')
    expect(content).toContain('新注册命令')
    expect(content).toContain('共 1 条')
  })
})
