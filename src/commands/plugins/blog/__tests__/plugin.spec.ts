import { describe, expect, it, vi } from 'vitest'

import { createCommandRuntime } from '@/commands'
import { createPluginApi } from '@/commands/loader'
import { blogPlugin } from '@/commands/plugins/blog'
import { BLOG_MOUNT_TARGET } from '@/commands/plugins/blog/tree'
import { demoPlugin } from '@/commands/plugins/demo'
import type { DataSource } from '@/data/DataSource'
import { createFileSystem } from '@/fs'
import { buildTree } from '@/fs/build'
import { createCommandRegistry } from '@/terminal/registry/CommandRegistry'

import { createTestDataSource, testArticles } from './fixtures'

function createApi(dataSource: DataSource = createTestDataSource()) {
  const { vfs, mounts } = createFileSystem()
  return {
    api: createPluginApi({
      registry: createCommandRegistry(),
      mounts,
      vfs,
      dataSource,
    }),
    vfs,
    mounts,
  }
}

describe('blogPlugin', () => {
  it('exposes the blog command', () => {
    expect(blogPlugin.id).toBe('blog')
    expect(blogPlugin.commands?.map((command) => command.name)).toEqual(['blog'])
  })

  it('mounts the article tree during install', async () => {
    const { api, vfs, mounts } = createApi()

    await blogPlugin.install!(api)

    expect(mounts.list().map((point) => point.target)).toContain(BLOG_MOUNT_TARGET)
    expect(vfs.readDir(BLOG_MOUNT_TARGET)?.map((node) => node.name)).toEqual([
      'vfs-notes.md',
      'about.md',
      'hello.md',
    ])
    expect(vfs.readFile('/mnt/blog/vfs-notes.md')).toBe(testArticles[0]!.content)
    expect(vfs.resolve('/mnt/blog/about.md').node?.meta).toEqual({
      mime: 'text/markdown',
      title: '关于本站与作者',
      date: '2026-11-08',
      tags: '公告,随笔',
    })
  })

  it('mounts an empty directory for an empty manifest and still registers the command', async () => {
    const runtime = createCommandRuntime({
      dataSource: createTestDataSource([]),
      ...createFileSystem(),
      plugins: [blogPlugin],
    })

    await runtime.ready

    expect(runtime.deps.vfs.readDir('/mnt/blog')).toEqual([])
    expect(runtime.registry.get('blog')).toBeDefined()
  })

  it('skips an article whose body failed to load', async () => {
    const partial: DataSource = {
      async fetchArticleList() {
        return testArticles.map(({ content: _content, ...summary }) => summary)
      },
      async fetchArticle(id: string) {
        const article = testArticles.find((item) => item.id === id)
        return article && article.id !== 'hello' ? article : null
      },
    }
    const { api, vfs } = createApi(partial)

    await blogPlugin.install!(api)

    expect(vfs.readDir('/mnt/blog')?.map((node) => node.name)).toEqual([
      'vfs-notes.md',
      'about.md',
    ])
  })

  it('still registers the command when the mount target is already occupied', async () => {
    const fileSystem = createFileSystem()
    fileSystem.mounts.mount(BLOG_MOUNT_TARGET, buildTree({}))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const runtime = createCommandRuntime({
        dataSource: createTestDataSource(),
        ...fileSystem,
        plugins: [blogPlugin],
      })

      await expect(runtime.ready).resolves.toBeUndefined()
      expect(runtime.registry.get('blog')).toBeDefined()
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('does not block other plugins when blog install fails', async () => {
    const failing: DataSource = {
      async fetchArticleList() {
        throw new Error('manifest failed')
      },
      async fetchArticle() {
        return null
      },
    }
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const runtime = createCommandRuntime({
        dataSource: failing,
        ...createFileSystem(),
        plugins: [blogPlugin, demoPlugin],
      })

      await runtime.ready

      expect(runtime.registry.get('blog')).toBeUndefined()
      expect(runtime.registry.get('mount')).toBeDefined()
      expect(runtime.deps.vfs.readDir('/mnt/demo')).not.toBeNull()
      expect(error).toHaveBeenCalled()
    } finally {
      error.mockRestore()
    }
  })
})
