import { describe, expect, it } from 'vitest'

import { clearCommand } from '@/commands/builtin/clear'

import { createTestContext } from './helpers'

describe('clear 命令', () => {
  it('clears existing output', () => {
    const { context, chunks } = createTestContext()
    context.output.write('before')

    clearCommand.execute(context)

    expect(chunks).toEqual([])
  })

  it('rejects positional arguments and keeps the output', () => {
    const { context, chunks } = createTestContext({ args: ['foo'] })
    context.output.write('before')

    clearCommand.execute(context)

    expect(chunks).toHaveLength(2)
    expect(chunks[1]).toEqual({ type: 'error', content: 'clear: 不接受参数' })
  })

  it('rejects options and keeps the output', () => {
    const { context, chunks } = createTestContext({ options: { '--help': true } })
    context.output.write('before')

    clearCommand.execute(context)

    expect(chunks).toHaveLength(2)
    expect(chunks[1]).toEqual({ type: 'error', content: 'clear: 不接受参数' })
  })
})
