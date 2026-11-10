import { describe, expect, it } from 'vitest'

import { historyCommand } from '@/commands/builtin/history'

import { createTestContext } from './helpers'

function textOf(chunks: ReturnType<typeof createTestContext>['chunks']): string {
  const chunk = chunks[0]
  return chunk?.type === 'text' ? chunk.content : ''
}

describe('history 命令', () => {
  it('输出带右对齐序号的历史', () => {
    const { context, chunks } = createTestContext({
      history: ['pwd', 'cd /mnt', 'history'],
    })

    historyCommand.execute(context)

    expect(chunks).toHaveLength(1)
    expect(textOf(chunks).split('\n')).toEqual([
      '   1  pwd',
      '   2  cd /mnt',
      '   3  history',
    ])
  })

  it('序号按 4 位最小宽度对齐（两位数不改变列宽）', () => {
    const history = Array.from({ length: 12 }, (_, index) => `cmd-${index + 1}`)
    const { context, chunks } = createTestContext({ history })

    historyCommand.execute(context)

    const lines = textOf(chunks).split('\n')
    expect(lines).toHaveLength(12)
    expect(lines[0]).toBe('   1  cmd-1')
    expect(lines[9]).toBe('  10  cmd-10')
    expect(lines[11]).toBe('  12  cmd-12')
  })

  it('超过 9999 条时序号宽度随位数扩展', () => {
    const history = Array.from({ length: 10_000 }, (_, index) => `cmd-${index + 1}`)
    const { context, chunks } = createTestContext({ history })

    historyCommand.execute(context)

    const lines = textOf(chunks).split('\n')
    expect(lines).toHaveLength(10_000)
    expect(lines[0]).toBe('    1  cmd-1')
    expect(lines[9_999]).toBe('10000  cmd-10000')
  })

  it('历史为空时不输出内容', () => {
    const { context, chunks } = createTestContext({ history: [] })

    historyCommand.execute(context)

    expect(chunks).toEqual([])
  })

  it('包含当前命令自身（由 Store 在提交时记录）', () => {
    const { context, chunks } = createTestContext({ history: ['pwd', 'history'] })

    historyCommand.execute(context)

    const lines = textOf(chunks).split('\n')
    expect(lines[lines.length - 1]).toContain('history')
  })

  it('拒绝位置参数', () => {
    const { context, chunks } = createTestContext({ args: ['5'] })

    historyCommand.execute(context)

    expect(chunks).toEqual([{ type: 'error', content: 'history: 不接受参数' }])
  })

  it('拒绝选项', () => {
    const { context, chunks } = createTestContext({ options: { '-c': true } })

    historyCommand.execute(context)

    expect(chunks).toEqual([{ type: 'error', content: 'history: 不接受参数' }])
  })
})
