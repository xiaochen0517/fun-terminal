import { afterEach, describe, expect, it, vi } from 'vitest'

import type { DataSource } from '@/data/DataSource'
import type { Command, CommandContext } from '@/terminal/context/CommandContext'
import { createOutputBuffer } from '@/terminal/context/buffer'
import type { OutputChunk } from '@/terminal/context/OutputBuffer'
import { createCommandExecutor } from '@/terminal/executor/CommandExecutor'
import { createCommandContextBuilder } from '@/terminal/executor/context'
import {
  formatInternalError,
  formatUnknownCommand,
} from '@/terminal/executor/messages'
import { createCommandParser } from '@/terminal/parser/CommandParser'
import { createCommandRegistry } from '@/terminal/registry/CommandRegistry'

const dataSource: DataSource = {
  async fetchArticleList() {
    return []
  },
  async fetchArticle() {
    return null
  },
}

function createOutput() {
  const chunks: OutputChunk[] = []
  const output = createOutputBuffer({
    get chunks() {
      return chunks
    },
    append(chunk) {
      chunks.push(chunk)
    },
    clear() {
      chunks.length = 0
    },
  })
  return { chunks, output }
}

function createHarness(commands: Command[]) {
  const registry = createCommandRegistry()
  registry.registerAll(commands)
  const { chunks, output } = createOutput()
  const executor = createCommandExecutor({
    registry,
    parser: createCommandParser(),
    output,
    buildContext: createCommandContextBuilder({
      getCwd: () => '/home/guest',
      getEnv: () => ({ USER: 'guest', HOME: '/home/guest' }),
      setCwd: () => {},
      getCommands: () => registry.all(),
      dataSource,
    }),
  })
  return { chunks, executor, registry }
}

describe('createCommandExecutor', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('executes a registered command with parsed args and options', async () => {
    const received: CommandContext[] = []
    const command: Command = {
      name: 'echo',
      description: '输出文本',
      execute(ctx) {
        received.push(ctx)
        ctx.output.write(ctx.args.join(' '))
      },
    }
    const { chunks, executor } = createHarness([command])

    await executor.execute('echo  hello   world --name=value')

    expect(received).toHaveLength(1)
    expect(received[0]?.args).toEqual(['hello', 'world'])
    expect(received[0]?.options).toEqual({ '--name': 'value' })
    expect(received[0]?.cwd).toBe('/home/guest')
    expect(received[0]?.env).toEqual({ USER: 'guest', HOME: '/home/guest' })
    expect(received[0]?.dataSource).toBe(dataSource)
    expect(received[0]?.commands.map((item) => item.name)).toEqual(['echo'])
    expect(chunks).toEqual([{ type: 'text', content: 'hello world' }])
  })

  it('reports unknown commands without interrupting the session', async () => {
    const { chunks, executor } = createHarness([])

    await executor.execute('  ls -la /mnt  ')
    await executor.execute('echo ok')

    expect(chunks).toEqual([
      { type: 'error', content: formatUnknownCommand('ls') },
      { type: 'error', content: formatUnknownCommand('echo') },
    ])
  })

  it('catches synchronous command errors', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { chunks, executor } = createHarness([
      {
        name: 'boom',
        description: '抛出异常',
        execute() {
          throw new Error('炸了')
        },
      },
    ])

    await expect(executor.execute('boom')).resolves.toBeUndefined()

    expect(chunks).toEqual([{ type: 'error', content: formatInternalError('boom', new Error('炸了')) }])
    expect(error).toHaveBeenCalledOnce()
  })

  it('catches asynchronous command rejections', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { chunks, executor } = createHarness([
      {
        name: 'async-boom',
        description: '异步失败',
        async execute() {
          throw new Error('异步炸了')
        },
      },
    ])

    await expect(executor.execute('async-boom')).resolves.toBeUndefined()

    const errorChunk = chunks[0]
    expect(errorChunk?.type === 'error' ? errorChunk.content : '').toContain('异步炸了')
  })

  it('handles non-Error throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { chunks, executor } = createHarness([
      {
        name: 'weird',
        description: '非 Error 抛错',
        execute() {
          throw '字符串异常'  
        },
      },
    ])

    await executor.execute('weird')

    expect(chunks).toEqual([{ type: 'error', content: 'weird: 内部错误：字符串异常' }])
  })

  it('ignores blank input', async () => {
    const { chunks, executor } = createHarness([])

    await executor.execute('   ')
    await executor.execute('')

    expect(chunks).toEqual([])
  })

  it('keeps output order when commands resolve out of order', async () => {
    const { chunks, executor } = createHarness([
      {
        name: 'slow',
        description: '慢命令',
        async execute(ctx) {
          await new Promise((resolve) => setTimeout(resolve, 10))
          ctx.output.write('slow')
        },
      },
      {
        name: 'fast',
        description: '快命令',
        execute(ctx) {
          ctx.output.write('fast')
        },
      },
    ])

    await Promise.all([executor.execute('slow'), executor.execute('fast')])

    expect(chunks).toEqual([
      { type: 'text', content: 'slow' },
      { type: 'text', content: 'fast' },
    ])
  })

  it('applies setCwd from the command context', async () => {
    let cwd = '/home/guest'
    const registry = createCommandRegistry()
    registry.register({
      name: 'cd',
      description: '切换目录',
      execute(ctx) {
        ctx.setCwd('/mnt')
      },
    })
    const { output } = createOutput()
    const executor = createCommandExecutor({
      registry,
      parser: createCommandParser(),
      output,
      buildContext: createCommandContextBuilder({
        getCwd: () => cwd,
        getEnv: () => ({}),
        setCwd(next) {
          cwd = next
        },
        getCommands: () => registry.all(),
        dataSource,
      }),
    })

    await executor.execute('cd')

    expect(cwd).toBe('/mnt')
  })
})
