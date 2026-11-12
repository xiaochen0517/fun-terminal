import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { commandRuntime } from '@/commands'
import { createDemoTree } from '@/commands/plugins/demo/tree'
import { siteConfig } from '@/config/site'
import { MAX_HISTORY, useTerminalStore } from '@/stores/terminal'

describe('useTerminalStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    // 应用级单例的 /mnt/demo 由示例插件在装配阶段挂载；这里只兜底
    // 其他用例卸载后的状态，不提交命令、不污染历史。
    const { mounts } = commandRuntime.deps
    if (!mounts.list().some((point) => point.target === '/mnt/demo')) {
      mounts.mount('/mnt/demo', createDemoTree())
    }
  })

  it('seeds the welcome chunks', () => {
    const store = useTerminalStore()

    expect(store.chunks).toHaveLength(siteConfig.messages.welcome.length)
    expect(store.chunks.every((chunk) => chunk.type === 'system')).toBe(true)
  })

  it('echoes the command and appends the command output', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('  echo hello world  ')

    expect(store.history).toEqual(['echo hello world'])
    expect(store.chunks).toHaveLength(2)
    expect(store.chunks[0]).toMatchObject({
      type: 'command',
      cwd: siteConfig.homeDir,
      input: 'echo hello world',
    })
    expect(store.chunks[1]).toEqual({ type: 'text', content: 'hello world' })
  })

  it('reports unknown commands as errors and keeps the session usable', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('foo --bar')

    expect(store.history).toEqual(['foo --bar'])
    expect(store.chunks).toHaveLength(2)
    expect(store.chunks[0]).toMatchObject({ type: 'command', input: 'foo --bar' })
    expect(store.chunks[1]).toMatchObject({ type: 'error' })
    const errorChunk = store.chunks[1]
    expect(errorChunk?.type === 'error' ? errorChunk.content : '').toContain('foo: 未找到命令')
  })

  it('ignores empty input', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('   ')

    expect(store.history).toEqual([])
    expect(store.chunks).toEqual([])
  })

  it('does not store adjacent duplicates', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('echo a')
    await store.submit('echo a')
    await store.submit('echo b')

    expect(store.history).toEqual(['echo a', 'echo b'])
  })

  it('keeps only the latest MAX_HISTORY entries', async () => {
    const store = useTerminalStore()

    for (let index = 0; index < MAX_HISTORY + 5; index += 1) {
      await store.submit(`cmd-${index}`)
    }

    expect(store.history).toHaveLength(MAX_HISTORY)
    expect(store.history[0]).toBe('cmd-5')
    expect(store.history[store.history.length - 1]).toBe(`cmd-${MAX_HISTORY + 4}`)
  })

  it('clears output through the clear command but keeps history and session state', async () => {
    const store = useTerminalStore()

    await store.submit('echo a')
    await store.submit('clear')

    expect(store.chunks).toEqual([])
    expect(store.history).toEqual(['echo a', 'clear'])
    expect(store.cwd).toBe(siteConfig.homeDir)
    expect(store.env).toEqual({
      USER: siteConfig.username,
      HOME: siteConfig.homeDir,
    })
  })

  it('rejects clear with arguments and keeps the output', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('clear foo')

    expect(store.history).toEqual(['clear foo'])
    expect(store.chunks).toHaveLength(2)
    expect(store.chunks[1]).toEqual({ type: 'error', content: 'clear: 不接受参数' })
  })

  it('navigates with cd and keeps pwd and the echo prompt in sync', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('cd /mnt')

    expect(store.cwd).toBe('/mnt')
    expect(store.chunks).toEqual([
      { type: 'command', cwd: siteConfig.homeDir, input: 'cd /mnt' },
    ])

    await store.submit('pwd')

    expect(store.chunks[1]).toMatchObject({ type: 'command', cwd: '/mnt', input: 'pwd' })
    expect(store.chunks[2]).toEqual({ type: 'text', content: '/mnt' })
  })

  it('reports cd errors and keeps the session directory', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('cd nope')

    expect(store.cwd).toBe(siteConfig.homeDir)
    expect(store.chunks[1]).toEqual({
      type: 'error',
      content: 'cd: 目录不存在: nope',
    })
  })

  it('lists the history including the history command itself', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('pwd')
    await store.submit('history')

    const chunk = store.chunks[store.chunks.length - 1]
    expect(chunk?.type === 'text' ? chunk.content : '').toBe('   1  pwd\n   2  history')
  })

  it('deduplicates adjacent commands in the history output', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('pwd')
    await store.submit('pwd')
    await store.submit('history')

    const chunk = store.chunks[store.chunks.length - 1]
    expect(chunk?.type === 'text' ? chunk.content : '').toBe('   1  pwd\n   2  history')
  })

  it('help lists every registered command including plugin commands', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('help')

    const chunk = store.chunks[store.chunks.length - 1]
    const content = chunk?.type === 'text' ? chunk.content : ''
    expect(content).toContain('共 11 条')
    for (const name of [
      'blog',
      'cat',
      'cd',
      'clear',
      'echo',
      'help',
      'history',
      'ls',
      'mount',
      'pwd',
      'unmount',
    ]) {
      expect(content).toContain(`  ${name}`)
    }
  })

  it('lists the home directory through ls', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('ls')

    const chunk = store.chunks[store.chunks.length - 1]
    expect(chunk).toEqual({ type: 'text', content: 'notes/\nREADME.md' })
  })

  it('reads text files through cat and keeps the content intact', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('cat README.md')

    const chunk = store.chunks[store.chunks.length - 1]
    const content = chunk?.type === 'text' ? chunk.content : ''
    expect(content.startsWith('# fun-terminal\n')).toBe(true)
    expect(content.endsWith('\n')).toBe(true)
  })

  it('numbers lines through cat -n', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('cat -n notes/welcome.txt')

    const chunk = store.chunks[store.chunks.length - 1]
    const content = chunk?.type === 'text' ? chunk.content : ''
    expect(content.startsWith('     1\t这是 notes 目录下的示例文本文件。\n')).toBe(true)
    expect(content).toContain('\n     2\t\n')
  })

  it('reports ls errors without breaking the session', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('ls nope')

    expect(store.chunks).toEqual([
      { type: 'command', cwd: siteConfig.homeDir, input: 'ls nope' },
      { type: 'error', content: 'ls: 无法访问 nope: 目录不存在' },
    ])

    await store.submit('echo ok')
    expect(store.chunks[store.chunks.length - 1]).toEqual({ type: 'text', content: 'ok' })
  })

  it('lists and reads the demo content mounted by the plugin', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('ls /mnt')
    expect(store.chunks[store.chunks.length - 1]).toEqual({
      type: 'text',
      content: 'blog/\ndemo/',
    })

    await store.submit('ls /mnt/demo')
    expect(store.chunks[store.chunks.length - 1]).toEqual({
      type: 'text',
      content: 'docs/\nnotes.txt\nREADME.md',
    })

    await store.submit('cat -n /mnt/demo/notes.txt')
    const chunk = store.chunks[store.chunks.length - 1]
    const content = chunk?.type === 'text' ? chunk.content : ''
    expect(content.startsWith('     1\t示例笔记：核心与插件的边界\n')).toBe(true)
  })

  it('lists mounts and can unmount and remount the demo content', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('mount')
    const listed = store.chunks[store.chunks.length - 1]
    const mountText = listed?.type === 'text' ? listed.content : ''
    expect(mountText).toContain('已挂载的目录（2）：')
    expect(mountText).toContain('/mnt/demo')
    expect(mountText).toContain('/mnt/blog')

    await store.submit('unmount /mnt/demo')
    expect(store.chunks[store.chunks.length - 1]).toEqual({
      type: 'text',
      content: '已卸载: /mnt/demo',
    })

    await store.submit('ls /mnt')
    expect(store.chunks[store.chunks.length - 1]).toEqual({
      type: 'text',
      content: 'blog/',
    })

    await store.submit('mount /mnt/demo')
    expect(store.chunks[store.chunks.length - 1]).toEqual({
      type: 'text',
      content: '已挂载: /mnt/demo',
    })

    await store.submit('ls /mnt')
    expect(store.chunks[store.chunks.length - 1]).toEqual({
      type: 'text',
      content: 'blog/\ndemo/',
    })
  })

  it('keeps cwd after unmounting and warns through a system chunk', async () => {
    const store = useTerminalStore()
    store.clearOutput()

    await store.submit('cd /mnt/demo')
    await store.submit('unmount /mnt/demo')

    expect(store.cwd).toBe('/mnt/demo')
    expect(store.chunks[store.chunks.length - 1]).toEqual({
      type: 'system',
      content: '提示：当前目录位于已卸载的挂载点内，请使用 cd 切换到其他目录。',
    })

    await store.submit('ls')
    expect(store.chunks[store.chunks.length - 1]).toEqual({
      type: 'error',
      content: 'ls: 无法访问 /mnt/demo: 目录不存在',
    })

    await store.submit('cd ~')
    expect(store.cwd).toBe(siteConfig.homeDir)

    await store.submit('mount /mnt/demo')
    expect(store.chunks[store.chunks.length - 1]).toEqual({
      type: 'text',
      content: '已挂载: /mnt/demo',
    })
  })
})
