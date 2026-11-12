import { describe, expect, it } from 'vitest'

import { createCommandRuntime } from '@/commands'
import { blogPlugin } from '@/commands/plugins/blog'
import { createTestDataSource, testArticles } from '@/commands/plugins/blog/__tests__/fixtures'
import { demoPlugin } from '@/commands/plugins/demo'
import { createFileSystem } from '@/fs'
import { createOutputBuffer } from '@/terminal/context/buffer'
import type { OutputChunk } from '@/terminal/context/OutputBuffer'
import { createCommandExecutor } from '@/terminal/executor/CommandExecutor'
import { createCommandContextBuilder } from '@/terminal/executor/context'
import { createCommandParser } from '@/terminal/parser/CommandParser'

function createRuntimeHarness() {
  const dataSource = createTestDataSource()
  const fileSystem = createFileSystem()
  const runtime = createCommandRuntime({
    dataSource,
    ...fileSystem,
    plugins: [demoPlugin, blogPlugin],
  })

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

  const executor = createCommandExecutor({
    registry: runtime.registry,
    parser: createCommandParser(),
    output,
    ready: runtime.ready,
    buildContext: createCommandContextBuilder({
      getCwd: () => '/home/guest',
      getEnv: () => ({ USER: 'guest', HOME: '/home/guest' }),
      setCwd: () => {},
      getCommands: () => runtime.commands,
      getHistory: () => [],
      dataSource,
      vfs: runtime.deps.vfs,
      mounts: runtime.deps.mounts,
    }),
  })

  async function run(command: string) {
    chunks.length = 0
    await executor.execute(command)
    return chunks[chunks.length - 1]
  }

  return { runtime, run }
}

describe('blog runtime', () => {
  it('executes blog list end to end', async () => {
    const { run } = createRuntimeHarness()
    const chunk = await run('blog list')

    expect(chunk?.type).toBe('text')
    expect(chunk?.type === 'text' ? chunk.content : '').toContain('共 3 篇文章')
  })

  it('renders blog read and keeps --raw / cat identical', async () => {
    const { runtime, run } = createRuntimeHarness()

    const read = await run('blog read about')
    expect(read?.type).toBe('html')
    expect(read?.type === 'html' ? read.content : '').toContain(
      '<div class="md__meta">2026-11-08 · 公告 / 随笔</div>',
    )
    expect(read?.type === 'html' ? read.content : '').toContain('<table>')

    const raw = await run('blog read --raw about')
    const cat = await run('cat /mnt/blog/about.md')
    expect(raw?.type).toBe('text')
    expect(cat?.type).toBe('text')
    expect(raw).toEqual(cat)
    expect(raw?.type === 'text' ? raw.content : '').toBe(testArticles[1]!.content)

    expect(runtime.deps.vfs.readFile('/mnt/blog/about.md')).toBe(testArticles[1]!.content)
  })

  it('executes blog tags and blog tag', async () => {
    const { run } = createRuntimeHarness()

    const tags = await run('blog tags')
    expect(tags?.type).toBe('text')
    expect(tags?.type === 'text' ? tags.content : '').toContain('公告（2 篇）')

    const tag = await run('blog tag 公告')
    expect(tag?.type).toBe('text')
    expect(tag?.type === 'text' ? tag.content : '').toContain(
      '标签「公告」下的文章（2 篇）',
    )
  })

  it('help includes blog and counts 11 commands', async () => {
    const { run } = createRuntimeHarness()
    const help = await run('help')

    const content = help?.type === 'text' ? help.content : ''
    expect(content).toContain('共 11 条')
    expect(content).toContain('  blog')
  })
})
