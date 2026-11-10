import { describe, expect, it } from 'vitest'

import { pwdCommand } from '@/commands/builtin/pwd'

import { createTestContext } from './helpers'

describe('pwd 命令', () => {
  it('输出默认工作目录', () => {
    const { context, chunks } = createTestContext()

    pwdCommand.execute(context)

    expect(chunks).toEqual([{ type: 'text', content: '/home/guest' }])
  })

  it('输出根目录', () => {
    const { context, chunks } = createTestContext({ cwd: '/' })

    pwdCommand.execute(context)

    expect(chunks).toEqual([{ type: 'text', content: '/' }])
  })

  it('拒绝位置参数且不输出路径', () => {
    const { context, chunks } = createTestContext({ args: ['/mnt'] })

    pwdCommand.execute(context)

    expect(chunks).toEqual([{ type: 'error', content: 'pwd: 不接受参数' }])
  })

  it('拒绝选项且不输出路径', () => {
    const { context, chunks } = createTestContext({ options: { '-P': true } })

    pwdCommand.execute(context)

    expect(chunks).toEqual([{ type: 'error', content: 'pwd: 不接受参数' }])
  })
})
