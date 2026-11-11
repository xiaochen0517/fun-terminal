import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PluginApi } from '@/commands/CommandPlugin'
import { createPluginApi, installPlugin } from '@/commands/loader'
import { demoPlugin } from '@/commands/plugins/demo'
import {
  createDemoTree,
  DEMO_MOUNT_TARGET,
  DEMO_PLUGIN_GUIDE,
  DEMO_README,
} from '@/commands/plugins/demo/tree'
import type { DataSource } from '@/data/DataSource'
import { createFileSystem } from '@/fs'
import type { MountApi } from '@/fs/mount'
import type { Vfs } from '@/fs/vfs'
import { createCommandRegistry } from '@/terminal/registry/CommandRegistry'
import type { CommandRegistry } from '@/terminal/registry/CommandRegistry'

const dataSource: DataSource = {
  async fetchArticleList() {
    return []
  },
  async fetchArticle() {
    return null
  },
}

function createHarness(): {
  api: PluginApi
  registry: CommandRegistry
  mounts: MountApi
  vfs: Vfs
} {
  const registry = createCommandRegistry()
  const { vfs, mounts } = createFileSystem()
  return {
    api: createPluginApi({ registry, mounts, vfs, dataSource }),
    registry,
    mounts,
    vfs,
  }
}

describe('createDemoTree', () => {
  it('builds README.md, notes.txt and docs/plugin.md', () => {
    const tree = createDemoTree()

    expect(tree.type).toBe('directory')
    expect(tree.children?.map((child) => `${child.name}:${child.type}`)).toEqual([
      'README.md:file',
      'notes.txt:file',
      'docs:directory',
    ])
    expect(tree.children?.find((child) => child.name === 'README.md')?.content).toBe(DEMO_README)
    expect(
      tree.children?.find((child) => child.name === 'docs')?.children?.[0]?.content,
    ).toBe(DEMO_PLUGIN_GUIDE)
  })

  it('returns independent nodes for each call', () => {
    const first = createDemoTree()
    const second = createDemoTree()

    expect(first).not.toBe(second)
    expect(first.children?.[0]).not.toBe(second.children?.[0])
    expect(first.parent).toBeNull()
    expect(second.parent).toBeNull()
  })
})

describe('demoPlugin', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('declares its id and both plugin commands', () => {
    expect(demoPlugin.id).toBe('demo')
    expect(demoPlugin.commands?.map((command) => command.name)).toEqual(['mount', 'unmount'])
  })

  it('mounts /mnt/demo during install and registers its commands', async () => {
    const { api, registry, mounts, vfs } = createHarness()

    const installed = await installPlugin(api, demoPlugin)

    expect(installed).toBe(true)
    expect(mounts.list().map((point) => point.target)).toEqual([DEMO_MOUNT_TARGET])
    expect(vfs.readFile('/mnt/demo/README.md')).toBe(DEMO_README)
    expect(vfs.readDir('/mnt')?.map((node) => node.name)).toEqual(['demo'])
    expect(vfs.resolve('/mnt/blog').node).toBeNull()
    expect(registry.has('mount')).toBe(true)
    expect(registry.has('unmount')).toBe(true)
  })

  it('keeps the first mount and warns when installed twice', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { api, mounts } = createHarness()

    await installPlugin(api, demoPlugin)
    const firstNode = mounts.list()[0]?.node
    await installPlugin(api, demoPlugin)

    expect(mounts.list()).toHaveLength(1)
    expect(mounts.list()[0]?.node).toBe(firstNode)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('挂载点重复'))
  })
})
