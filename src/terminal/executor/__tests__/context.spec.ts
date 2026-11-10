import { describe, expect, it, vi } from 'vitest'

import type { DataSource } from '@/data/DataSource'
import { buildTree } from '@/fs/build'
import { createFileSystem } from '@/fs'
import type { MountApi } from '@/fs/mount'
import type { Vfs } from '@/fs/vfs'
import type { Command, CommandContext } from '@/terminal/context/CommandContext'
import { createOutputBuffer } from '@/terminal/context/buffer'
import type { OutputChunk } from '@/terminal/context/OutputBuffer'
import { createCommandContextBuilder } from '@/terminal/executor/context'
import type { CommandSessionAccess } from '@/terminal/executor/context'

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
  return output
}

function createCommand(name: string): Command {
  return { name, description: `${name} 命令`, execute() {} }
}

function createAccess(
  overrides: Partial<CommandSessionAccess> = {},
  fileSystem: { vfs: Vfs; mounts: MountApi } = createFileSystem(),
): CommandSessionAccess {
  return {
    getCwd: () => '/home/guest',
    getEnv: () => ({ USER: 'guest' }),
    setCwd: () => {},
    getCommands: () => [],
    dataSource,
    vfs: fileSystem.vfs,
    mounts: fileSystem.mounts,
    ...overrides,
  }
}

describe('createCommandContextBuilder', () => {
  it('copies args and options so commands cannot mutate the parse result', () => {
    const commands = [createCommand('echo')]
    const parsed = { name: 'echo', args: ['a'], options: { '-l': true } }
    const output = createOutput()
    const builder = createCommandContextBuilder(
      createAccess({ getCommands: () => commands }),
    )

    const context = builder(parsed, output)
    context.args.push('b')
    context.options['-l'] = false

    expect(parsed.args).toEqual(['a'])
    expect(parsed.options).toEqual({ '-l': true })
  })

  it('copies the environment', () => {
    const env: Record<string, string> = { USER: 'guest' }
    const builder = createCommandContextBuilder(
      createAccess({ getEnv: () => env }),
    )

    const context = builder({ name: 'echo', args: [], options: {} }, createOutput())
    context.env.USER = 'changed'

    expect(env.USER).toBe('guest')
  })

  it('reads cwd at build time', () => {
    let cwd = '/home/guest'
    const builder = createCommandContextBuilder(
      createAccess({ getCwd: () => cwd }),
    )

    expect(builder({ name: 'pwd', args: [], options: {} }, createOutput()).cwd).toBe(
      '/home/guest',
    )

    cwd = '/mnt'
    expect(builder({ name: 'pwd', args: [], options: {} }, createOutput()).cwd).toBe('/mnt')
  })

  it('exposes the command snapshot and dependencies', () => {
    const commands = [createCommand('echo')]
    const output = createOutput()
    const builder = createCommandContextBuilder(
      createAccess({ getCommands: () => commands }),
    )

    const context: CommandContext = builder(
      { name: 'help', args: [], options: {} },
      output,
    )

    expect(context.commands).toBe(commands)
    expect(context.dataSource).toBe(dataSource)
    expect(context.output).toBe(output)
  })

  it('delegates setCwd to the session accessor', () => {
    const setCwd = vi.fn<(next: string) => void>()
    const builder = createCommandContextBuilder(createAccess({ setCwd }))

    builder({ name: 'cd', args: ['/mnt'], options: {} }, createOutput()).setCwd('/mnt')

    expect(setCwd).toHaveBeenCalledWith('/mnt')
  })

  it('passes the vfs and mounts instances through', () => {
    const fileSystem = createFileSystem()
    const builder = createCommandContextBuilder(createAccess({}, fileSystem))

    const context = builder({ name: 'ls', args: [], options: {} }, createOutput())

    expect(context.vfs).toBe(fileSystem.vfs)
    expect(context.mounts).toBe(fileSystem.mounts)
  })

  it('exposes a usable vfs to commands', () => {
    const fileSystem = createFileSystem()
    fileSystem.mounts.mount('/mnt/blog', buildTree({ 'hello.md': '# 你好' }))
    const builder = createCommandContextBuilder(createAccess({}, fileSystem))

    const context = builder({ name: 'cat', args: [], options: {} }, createOutput())

    expect(context.vfs.readDir('/mnt')?.map((entry) => entry.name)).toEqual(['blog'])
    expect(context.vfs.readFile('/mnt/blog/hello.md')).toBe('# 你好')
    expect(context.mounts.list().map((point) => point.target)).toEqual(['/mnt/blog'])
  })
})
