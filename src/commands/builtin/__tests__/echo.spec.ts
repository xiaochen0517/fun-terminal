import { describe, expect, it } from 'vitest'

import { echoCommand } from '@/commands/builtin/echo'

import { createTestContext } from './helpers'

describe('echo 命令', () => {
  it('joins positional arguments with a single space', () => {
    const { context, chunks } = createTestContext({ args: ['hello', 'world'] })

    echoCommand.execute(context)

    expect(chunks).toEqual([{ type: 'text', content: 'hello world' }])
  })

  it('keeps a quoted argument containing spaces as one chunk of text', () => {
    const { context, chunks } = createTestContext({ args: ['hello   world'] })

    echoCommand.execute(context)

    expect(chunks).toEqual([{ type: 'text', content: 'hello   world' }])
  })

  it('writes an empty text chunk without arguments', () => {
    const { context, chunks } = createTestContext()

    echoCommand.execute(context)

    expect(chunks).toEqual([{ type: 'text', content: '' }])
  })

  it('does not include options in the output', () => {
    const { context, chunks } = createTestContext({
      args: ['tail'],
      options: { '-n': true },
    })

    echoCommand.execute(context)

    expect(chunks).toEqual([{ type: 'text', content: 'tail' }])
  })
})
