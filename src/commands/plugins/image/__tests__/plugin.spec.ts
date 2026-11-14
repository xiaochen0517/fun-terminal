import { describe, expect, it, vi } from 'vitest'

import { createCommandRuntime } from '@/commands'
import { createTestContext } from '@/commands/builtin/__tests__/helpers'
import { catCommand } from '@/commands/builtin/cat'
import { createPluginApi } from '@/commands/loader'
import { imagePlugin } from '@/commands/plugins/image'
import { GALLERY_MOUNT_TARGET } from '@/commands/plugins/image/tree'
import { buildTree } from '@/fs/build'
import { createFileSystem } from '@/fs'
import { createCommandRegistry } from '@/terminal/registry/CommandRegistry'

describe('imagePlugin', () => {
  it('exposes the img command', () => {
    expect(imagePlugin.id).toBe('image')
    expect(imagePlugin.commands?.map((command) => command.name)).toEqual(['img'])
  })

  it('mounts the gallery during install', async () => {
    const { context } = createTestContext()
    const api = createPluginApi({
      registry: createCommandRegistry(),
      mounts: context.mounts,
      vfs: context.vfs,
      dataSource: {
        async fetchArticleList() {
          return []
        },
        async fetchArticle() {
          return null
        },
      },
    })

    await imagePlugin.install!(api)

    expect(GALLERY_MOUNT_TARGET).toBe('/mnt/gallery')
    expect(context.mounts.list().map((point) => point.target)).toContain('/mnt/gallery')
    expect(context.vfs.readDir('/mnt/gallery')?.map((node) => node.name)).toEqual([
      'domain-name.png',
      'pluto.jpg',
      'saturn.webp',
    ])
    expect(context.vfs.resolve('/mnt/gallery/domain-name.png').node?.meta).toMatchObject({
      mime: 'image/png',
      title: '域名的组成',
      width: '977',
      height: '358',
    })
    expect(context.vfs.resolve('/mnt/gallery/pluto.jpg').node?.meta?.src).toBeTruthy()
    expect(context.vfs.resolve('/mnt/gallery/saturn.webp').node?.meta?.src).toBeTruthy()
  })

  it('keeps the cat image hint pointing at a real command', async () => {
    const { context, chunks } = createTestContext()
    const api = createPluginApi({
      registry: createCommandRegistry(),
      mounts: context.mounts,
      vfs: context.vfs,
      dataSource: {
        async fetchArticleList() {
          return []
        },
        async fetchArticle() {
          return null
        },
      },
    })

    await imagePlugin.install!(api)

    context.args = ['/mnt/gallery/domain-name.png']
    catCommand.execute(context)

    const chunk = chunks[chunks.length - 1]
    expect(chunk?.type).toBe('error')
    expect(chunk?.type === 'error' ? chunk.content : '').toContain('请使用 img 查看')
    expect(chunks.some((item) => item.type === 'html')).toBe(false)
  })

  it('still registers img when the mount target is already occupied', async () => {
    const fileSystem = createFileSystem()
    fileSystem.mounts.mount(GALLERY_MOUNT_TARGET, buildTree({}))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const runtime = createCommandRuntime({
        dataSource: {
          async fetchArticleList() {
            return []
          },
          async fetchArticle() {
            return null
          },
        },
        ...fileSystem,
        plugins: [imagePlugin],
      })

      await expect(runtime.ready).resolves.toBeUndefined()
      expect(runtime.registry.get('img')).toBeDefined()
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })
})
