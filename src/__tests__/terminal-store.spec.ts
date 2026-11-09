import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { siteConfig } from '@/config/site'
import { MAX_HISTORY, useTerminalStore } from '@/stores/terminal'

describe('useTerminalStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds the welcome chunks', () => {
    const store = useTerminalStore()

    expect(store.chunks).toHaveLength(siteConfig.messages.welcome.length)
    expect(store.chunks.every((chunk) => chunk.type === 'system')).toBe(true)
  })

  it('echoes a command and writes the temporary notice', () => {
    const store = useTerminalStore()
    store.clearOutput()
    store.submit('  hello world  ')

    expect(store.history).toEqual(['hello world'])
    expect(store.chunks).toHaveLength(2)
    expect(store.chunks[0]).toMatchObject({
      type: 'command',
      cwd: siteConfig.homeDir,
      input: 'hello world',
    })
    expect(store.chunks[1]).toMatchObject({
      type: 'system',
      content: siteConfig.messages.commandUnavailable,
    })
  })

  it('ignores empty input', () => {
    const store = useTerminalStore()
    store.clearOutput()
    store.submit('   ')

    expect(store.history).toEqual([])
    expect(store.chunks).toEqual([])
  })

  it('does not store adjacent duplicates', () => {
    const store = useTerminalStore()
    store.clearOutput()
    store.submit('echo a')
    store.submit('echo a')
    store.submit('echo b')

    expect(store.history).toEqual(['echo a', 'echo b'])
  })

  it('keeps only the latest MAX_HISTORY entries', () => {
    const store = useTerminalStore()

    for (let index = 0; index < MAX_HISTORY + 5; index += 1) {
      store.submit(`cmd-${index}`)
    }

    expect(store.history).toHaveLength(MAX_HISTORY)
    expect(store.history[0]).toBe('cmd-5')
    expect(store.history[store.history.length - 1]).toBe(`cmd-${MAX_HISTORY + 4}`)
  })

  it('clears output but keeps history and session state', () => {
    const store = useTerminalStore()
    store.submit('echo a')
    store.submit('clear')

    expect(store.chunks).toEqual([])
    expect(store.history).toEqual(['echo a', 'clear'])
    expect(store.cwd).toBe(siteConfig.homeDir)
    expect(store.env).toEqual({
      USER: siteConfig.username,
      HOME: siteConfig.homeDir,
    })
  })

  it('only treats an exact clear command as clear', () => {
    const store = useTerminalStore()
    store.clearOutput()
    store.submit('clear foo')

    expect(store.chunks).toHaveLength(2)
    expect(store.history).toEqual(['clear foo'])
  })
})
