import { describe, expect, it } from 'vitest'

import { helpCommand } from '@/commands/builtin/help'
import type { Command } from '@/terminal/context/CommandContext'

import { createTestContext } from './helpers'

function createCommand(name: string, description: string, usage?: string): Command {
  return { name, description, usage, execute() {} }
}

describe('help 命令', () => {
  it('lists every registered command sorted by name', () => {
    const commands = [
      createCommand('help', '查看可用命令', 'help [命令]'),
      createCommand('echo', '输出传入的文本', 'echo <文本...>'),
      createCommand('clear', '清空终端输出'),
    ]
    const { context, chunks } = createTestContext({ commands })

    helpCommand.execute(context)

    expect(chunks).toHaveLength(1)
    const content = chunks[0]?.type === 'text' ? chunks[0].content : ''
    const lines = content.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('clear')
    expect(lines[1]).toContain('echo')
    expect(lines[2]).toContain('help')
    expect(content).toContain('输出传入的文本')
  })

  it('shows usage and description for a single command', () => {
    const commands = [createCommand('echo', '输出传入的文本', 'echo <文本...>')]
    const { context, chunks } = createTestContext({ args: ['echo'], commands })

    helpCommand.execute(context)

    const content = chunks[0]?.type === 'text' ? chunks[0].content : ''
    expect(content).toContain('echo - 输出传入的文本')
    expect(content).toContain('用法: echo <文本...>')
  })

  it('falls back to the command name when usage is absent', () => {
    const commands = [createCommand('clear', '清空终端输出')]
    const { context, chunks } = createTestContext({ args: ['clear'], commands })

    helpCommand.execute(context)

    const content = chunks[0]?.type === 'text' ? chunks[0].content : ''
    expect(content).toContain('用法: clear')
  })

  it('reports unknown commands', () => {
    const { context, chunks } = createTestContext({
      args: ['nope'],
      commands: [createCommand('echo', '输出文本')],
    })

    helpCommand.execute(context)

    expect(chunks).toEqual([{ type: 'error', content: 'help: 未找到命令: nope' }])
  })

  it('derives the list from ctx.commands instead of a hardcoded list', () => {
    const { context, chunks } = createTestContext({
      commands: [createCommand('brand-new', '新注册命令')],
    })

    helpCommand.execute(context)

    const content = chunks[0]?.type === 'text' ? chunks[0].content : ''
    expect(content).toContain('brand-new')
    expect(content).toContain('新注册命令')
  })
})
