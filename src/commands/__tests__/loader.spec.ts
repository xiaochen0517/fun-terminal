import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CommandPlugin } from '@/commands/CommandPlugin'
import { createPluginApi, installPlugin, installPlugins } from '@/commands/loader'
import type { DataSource } from '@/data/DataSource'
import { createFileSystem } from '@/fs'
import type { Command } from '@/terminal/context/CommandContext'
import { createCommandRegistry } from '@/terminal/registry/CommandRegistry'

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

function createHarness() {
  const registry = createCommandRegistry()
  const { vfs, mounts } = createFileSystem()
  const api = createPluginApi({ registry, mounts, vfs, dataSource })
  return { api, registry, dataSource, mounts, vfs }
}

describe('createPluginApi', () => {
  it('exposes the same registry / mounts / vfs / dataSource instances', () => {
    const { api, registry, dataSource, mounts, vfs } = createHarness()

    expect(api.registry).toBe(registry)
    expect(api.mounts).toBe(mounts)
    expect(api.vfs).toBe(vfs)
    expect(api.dataSource).toBe(dataSource)
  })
})

describe('installPlugin', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers declared commands after install and reports success', async () => {
    const order: boolean[] = []
    const plugin: CommandPlugin = {
      id: 'plain',
      commands: [command('plain-cmd')],
      install(api) {
        order.push(api.registry.has('plain-cmd'))
      },
    }
    const { api, registry } = createHarness()

    const installed = await installPlugin(api, plugin)

    expect(installed).toBe(true)
    expect(order).toEqual([false])
    expect(registry.all().map((item) => item.name)).toEqual(['plain-cmd'])
  })

  it('installs plugins without commands (register via api.registry)', async () => {
    const plugin: CommandPlugin = {
      id: 'manual',
      install(api) {
        api.registry.register(command('manual-cmd'))
      },
    }
    const { api, registry } = createHarness()

    const installed = await installPlugin(api, plugin)

    expect(installed).toBe(true)
    expect(registry.has('manual-cmd')).toBe(true)
  })

  it('keeps both api.registry and commands registrations', async () => {
    const plugin: CommandPlugin = {
      id: 'both',
      commands: [command('declared')],
      install(api) {
        api.registry.register(command('manual'))
      },
    }
    const { api, registry } = createHarness()

    await installPlugin(api, plugin)

    expect(registry.all().map((item) => item.name)).toEqual(['manual', 'declared'])
  })

  it('skips and warns for a plugin with neither install nor commands', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { api, registry } = createHarness()

    const installed = await installPlugin(api, {})

    expect(installed).toBe(false)
    expect(registry.all()).toEqual([])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('未提供命令或安装逻辑'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<未命名插件>'))
  })

  it('uses the plugin id in logs when present', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { api } = createHarness()

    const installed = await installPlugin(api, {
      id: 'boom',
      install() {
        throw new Error('炸了')
      },
    })

    expect(installed).toBe(false)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('boom'), expect.any(Error))
  })

  it('isolates synchronous install errors and skips its commands', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { api, registry } = createHarness()

    const failed = await installPlugin(api, {
      id: 'sync-fail',
      commands: [command('never')],
      install() {
        throw new Error('同步失败')
      },
    })
    const next = await installPlugin(api, { id: 'next', commands: [command('next-cmd')] })

    expect(failed).toBe(false)
    expect(next).toBe(true)
    expect(registry.has('never')).toBe(false)
    expect(registry.has('next-cmd')).toBe(true)
    expect(error).toHaveBeenCalledOnce()
  })

  it('isolates asynchronous install rejections and skips its commands', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { api, registry } = createHarness()

    const installed = await installPlugin(api, {
      id: 'async-fail',
      commands: [command('never')],
      async install() {
        await Promise.resolve()
        throw new Error('异步失败')
      },
    })

    expect(installed).toBe(false)
    expect(registry.has('never')).toBe(false)
  })

  it('handles non-Error throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { api, registry } = createHarness()

    const installed = await installPlugin(api, {
      id: 'string-throw',
      commands: [command('never')],
      install() {
        throw '字符串异常'
      },
    })

    expect(installed).toBe(false)
    expect(registry.has('never')).toBe(false)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('插件安装失败'), '字符串异常')
  })

  it('does not roll back commands registered before a throwing install', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { api, registry } = createHarness()

    await installPlugin(api, {
      id: 'partial',
      commands: [command('declared')],
      install(api) {
        api.registry.register(command('early'))
        throw new Error('装到一半失败')
      },
    })

    expect(registry.has('early')).toBe(true)
    expect(registry.has('declared')).toBe(false)
  })

  it('registers nothing when install throws before touching the registry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { api, registry } = createHarness()

    await installPlugin(api, {
      id: 'early-fail',
      commands: [command('declared')],
      install() {
        throw new Error('立刻失败')
      },
    })

    expect(registry.all()).toEqual([])
  })
})

describe('installPlugins', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('awaits each plugin before starting the next', async () => {
    const events: string[] = []
    const plugins: CommandPlugin[] = [
      {
        id: 'first',
        commands: [command('first-cmd')],
        async install() {
          await new Promise((resolve) => setTimeout(resolve, 10))
          events.push('first')
        },
      },
      {
        id: 'second',
        commands: [command('second-cmd')],
        install() {
          events.push('second')
        },
      },
    ]
    const { api, registry } = createHarness()

    await installPlugins(api, plugins)

    expect(events).toEqual(['first', 'second'])
    expect(registry.all().map((item) => item.name)).toEqual(['first-cmd', 'second-cmd'])
  })

  it('resolves for an empty plugin list', async () => {
    const { api } = createHarness()

    await expect(installPlugins(api, [])).resolves.toBeUndefined()
  })

  it('never rejects when a plugin fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { api, registry } = createHarness()

    await expect(
      installPlugins(api, [
        {
          id: 'broken',
          install() {
            throw new Error('坏插件')
          },
        },
        { id: 'healthy', commands: [command('healthy-cmd')] },
      ]),
    ).resolves.toBeUndefined()

    expect(registry.has('healthy-cmd')).toBe(true)
  })
})
