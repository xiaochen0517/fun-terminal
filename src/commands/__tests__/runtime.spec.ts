import { afterEach, describe, expect, it, vi } from 'vitest'

import { createCommandRuntime } from '@/commands'
import type { CommandPlugin, PluginApi } from '@/commands/CommandPlugin'
import { createDemoTree, DEMO_MOUNT_TARGET } from '@/commands/plugins/demo/tree'
import type { DataSource } from '@/data/DataSource'
import { createFileSystem } from '@/fs'
import type { MountResult } from '@/fs/mount'
import type { Command } from '@/terminal/context/CommandContext'

const dataSource: DataSource = {
  async fetchArticleList() {
    return []
  },
  async fetchArticle() {
    return null
  },
}

function command(name: string): Command {
  return { name, description: `${name} 命令`, execute() {} }
}

describe('createCommandRuntime', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers core commands synchronously before plugins are ready', () => {
    const { vfs, mounts } = createFileSystem()
    const runtime = createCommandRuntime({ dataSource, vfs, mounts, plugins: [] })

    expect(runtime.registry.has('ls')).toBe(true)
    expect(runtime.registry.has('cat')).toBe(true)
    expect(runtime.commands.map((item) => item.name)).toEqual([
      'echo',
      'help',
      'clear',
      'pwd',
      'cd',
      'history',
      'ls',
      'cat',
    ])
  })

  it('exposes plugin commands only after ready resolves', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const plugin: CommandPlugin = {
      id: 'slow',
      commands: [command('slow-cmd')],
      async install() {
        await gate
      },
    }
    const { vfs, mounts } = createFileSystem()
    const runtime = createCommandRuntime({ dataSource, vfs, mounts, plugins: [plugin] })

    expect(runtime.registry.has('slow-cmd')).toBe(false)
    expect(runtime.commands.map((item) => item.name)).not.toContain('slow-cmd')

    release()
    await runtime.ready

    expect(runtime.registry.has('slow-cmd')).toBe(true)
    expect(runtime.commands.map((item) => item.name)).toContain('slow-cmd')
  })

  it('returns the provided deps by reference', () => {
    const { vfs, mounts } = createFileSystem()
    const runtime = createCommandRuntime({ dataSource, vfs, mounts, plugins: [] })

    expect(runtime.deps.dataSource).toBe(dataSource)
    expect(runtime.deps.vfs).toBe(vfs)
    expect(runtime.deps.mounts).toBe(mounts)
  })

  it('hands plugins the same mounts / vfs and lets them mount content', async () => {
    const received: PluginApi[] = []
    const plugin: CommandPlugin = {
      id: 'mounting',
      install(api) {
        received.push(api)
        api.mounts.mount(DEMO_MOUNT_TARGET, createDemoTree())
      },
    }
    const { vfs, mounts } = createFileSystem()
    const runtime = createCommandRuntime({ dataSource, vfs, mounts, plugins: [plugin] })

    await runtime.ready

    expect(received).toHaveLength(1)
    expect(received[0]?.mounts).toBe(mounts)
    expect(received[0]?.vfs).toBe(vfs)
    expect(mounts.list().map((point) => point.target)).toEqual([DEMO_MOUNT_TARGET])
    expect(vfs.readFile('/mnt/demo/README.md')).toContain('示例挂载目录')
  })

  it('isolates a failing plugin from core and healthy plugins', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const plugins: CommandPlugin[] = [
      {
        id: 'broken',
        install() {
          throw new Error('坏插件')
        },
      },
      { id: 'healthy', commands: [command('healthy-cmd')] },
    ]
    const { vfs, mounts } = createFileSystem()
    const runtime = createCommandRuntime({ dataSource, vfs, mounts, plugins })

    await expect(runtime.ready).resolves.toBeUndefined()

    expect(runtime.registry.has('ls')).toBe(true)
    expect(runtime.registry.has('healthy-cmd')).toBe(true)
    expect(error).toHaveBeenCalledOnce()
  })

  it('never rejects ready even when every plugin fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { vfs, mounts } = createFileSystem()
    const runtime = createCommandRuntime({
      dataSource,
      vfs,
      mounts,
      plugins: [
        { id: 'a', install: () => Promise.reject(new Error('a')) },
        { id: 'b', install: () => Promise.reject(new Error('b')) },
      ],
    })

    await expect(runtime.ready).resolves.toBeUndefined()
    expect(runtime.registry.has('ls')).toBe(true)
  })

  it('keeps mount state isolated between runtimes', async () => {
    const first = createFileSystem()
    const second = createFileSystem()
    const plugin: CommandPlugin = {
      id: 'mounting',
      install(api) {
        api.mounts.mount(DEMO_MOUNT_TARGET, createDemoTree())
      },
    }

    const firstRuntime = createCommandRuntime({ ...first, dataSource, plugins: [plugin] })
    const secondRuntime = createCommandRuntime({ dataSource, ...second, plugins: [] })
    await Promise.all([firstRuntime.ready, secondRuntime.ready])

    expect(first.mounts.list()).toHaveLength(1)
    expect(first.vfs.exists('/mnt/demo')).toBe(true)
    expect(second.mounts.list()).toEqual([])
    expect(second.vfs.exists('/mnt/demo')).toBe(false)
  })

  it('does not let a plugin command shadow a core command', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { vfs, mounts } = createFileSystem()
    const runtime = createCommandRuntime({
      dataSource,
      vfs,
      mounts,
      plugins: [{ id: 'shadow', commands: [command('ls')] }],
    })

    await runtime.ready

    expect(runtime.registry.get('ls')?.description).toBe('列出目录内容')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('命令名冲突'))
  })

  it('rejects invalid mount targets during install and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const results: MountResult[] = []
    const { vfs, mounts } = createFileSystem()
    const runtime = createCommandRuntime({
      dataSource,
      vfs,
      mounts,
      plugins: [
        {
          id: 'invalid-targets',
          install(api) {
            for (const target of ['/', '/home/guest', '/tmp/x']) {
              results.push(api.mounts.mount(target, createDemoTree()))
            }
          },
        },
      ],
    })

    await runtime.ready

    expect(results).toEqual([
      { ok: false, reason: 'invalid-target' },
      { ok: false, reason: 'invalid-target' },
      { ok: false, reason: 'invalid-target' },
    ])
    expect(mounts.list()).toEqual([])
    expect(warn).toHaveBeenCalledTimes(3)
  })

  it('keeps the first mount when two plugins mount the same target', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const firstTree = createDemoTree()
    const results: MountResult[] = []
    const { vfs, mounts } = createFileSystem()
    const runtime = createCommandRuntime({
      dataSource,
      vfs,
      mounts,
      plugins: [
        {
          id: 'first',
          install(api) {
            results.push(api.mounts.mount(DEMO_MOUNT_TARGET, firstTree))
          },
        },
        {
          id: 'second',
          install(api) {
            results.push(api.mounts.mount(DEMO_MOUNT_TARGET, createDemoTree()))
          },
        },
      ],
    })

    await runtime.ready

    expect(results).toEqual([{ ok: true }, { ok: false, reason: 'duplicate' }])
    expect(mounts.list()).toHaveLength(1)
    expect(mounts.list()[0]?.node).toBe(firstTree)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('挂载点重复'))
  })
})
