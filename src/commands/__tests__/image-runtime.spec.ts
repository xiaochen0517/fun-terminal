import { describe, expect, it } from 'vitest'

import { createCommandRuntime } from '@/commands'
import { blogPlugin } from '@/commands/plugins/blog'
import { createTestDataSource } from '@/commands/plugins/blog/__tests__/fixtures'
import { demoPlugin } from '@/commands/plugins/demo'
import { imagePlugin } from '@/commands/plugins/image'
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
    plugins: [demoPlugin, blogPlugin, imagePlugin],
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

  let cwd = '/home/guest'

  const executor = createCommandExecutor({
    registry: runtime.registry,
    parser: createCommandParser(),
    output,
    ready: runtime.ready,
    buildContext: createCommandContextBuilder({
      getCwd: () => cwd,
      getEnv: () => ({ USER: 'guest', HOME: '/home/guest' }),
      setCwd: (next) => {
        cwd = next
      },
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

  return {
    runtime,
    run,
    getCwd: () => cwd,
  }
}

describe('image runtime', () => {
  it('help includes img and counts 12 commands', async () => {
    const { run } = createRuntimeHarness()
    const help = await run('help')

    const content = help?.type === 'text' ? help.content : ''
    expect(content).toContain('共 12 条')
    expect(content).toContain('  img')
  })

  it('lists the gallery and renders an image end to end', async () => {
    const { run } = createRuntimeHarness()

    const list = await run('ls /mnt')
    expect(list?.type === 'text' ? list.content : '').toBe('blog/\ndemo/\ngallery/')

    const gallery = await run('ls /mnt/gallery')
    expect(gallery?.type === 'text' ? gallery.content : '').toBe(
      'domain-name.png\npluto.jpg\nsaturn.webp',
    )

    const image = await run('img /mnt/gallery/domain-name.png')
    expect(image?.type).toBe('html')
    expect(image?.type === 'html' ? image.content : '').toContain('<figure class="img">')
    expect(image?.type === 'html' ? image.content : '').toContain('width="977"')
  })

  it('keeps cat pointing at img and shows image sizes as dashes', async () => {
    const { run } = createRuntimeHarness()

    const cat = await run('cat /mnt/gallery/domain-name.png')
    expect(cat?.type).toBe('error')
    expect(cat?.type === 'error' ? cat.content : '').toContain('请使用 img 查看')

    const long = await run('ls -l /mnt/gallery')
    const content = long?.type === 'text' ? long.content : ''
    expect(content).toContain('  -  domain-name.png')
    expect(content).toContain('  -  pluto.jpg')
    expect(content).toContain('  -  saturn.webp')
  })

  it('supports relative paths after cd and keeps cwd', async () => {
    const { run, getCwd } = createRuntimeHarness()

    await run('cd /mnt/gallery')
    expect(getCwd()).toBe('/mnt/gallery')

    const image = await run('img domain-name.png')
    expect(image?.type).toBe('html')
    expect(image?.type === 'html' ? image.content : '').toContain('src=')
    expect(getCwd()).toBe('/mnt/gallery')

    const pwd = await run('pwd')
    expect(pwd?.type === 'text' ? pwd.content : '').toBe('/mnt/gallery')
  })

  it('lists three mounts including the gallery', async () => {
    const { run } = createRuntimeHarness()
    const mount = await run('mount')

    const content = mount?.type === 'text' ? mount.content : ''
    expect(content).toContain('已挂载的目录（3）：')
    expect(content).toContain('/mnt/demo')
    expect(content).toContain('/mnt/blog')
    expect(content).toContain('/mnt/gallery')
  })
})
