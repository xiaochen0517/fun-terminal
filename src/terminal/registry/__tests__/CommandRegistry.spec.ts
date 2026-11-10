import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Command } from '@/terminal/context/CommandContext'
import { createCommandRegistry } from '@/terminal/registry/CommandRegistry'

function createCommand(name: string, description = `${name} 命令`): Command {
  return { name, description, execute() {} }
}

describe('createCommandRegistry', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers and looks up commands', () => {
    const registry = createCommandRegistry()
    const echo = createCommand('echo')

    registry.register(echo)

    expect(registry.get('echo')).toBe(echo)
    expect(registry.has('echo')).toBe(true)
    expect(registry.has('echo ')).toBe(false)
  })

  it('is case sensitive', () => {
    const registry = createCommandRegistry()
    registry.register(createCommand('echo'))

    expect(registry.get('ECHO')).toBeUndefined()
  })

  it('keeps registration order in all()', () => {
    const registry = createCommandRegistry()
    registry.register(createCommand('echo'))
    registry.register(createCommand('help'))

    expect(registry.all().map((command) => command.name)).toEqual(['echo', 'help'])
  })

  it('returns a snapshot from all()', () => {
    const registry = createCommandRegistry()
    registry.register(createCommand('echo'))

    const snapshot = registry.all()
    ;(snapshot as Command[]).push(createCommand('help'))

    expect(registry.all()).toHaveLength(1)
    expect(registry.has('help')).toBe(false)
  })

  it('keeps the first command and warns on duplicate names', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const registry = createCommandRegistry()
    const first = createCommand('echo', '第一个')
    const second = createCommand('echo', '第二个')

    registry.register(first)
    registry.register(second)

    expect(registry.get('echo')).toBe(first)
    expect(warn).toHaveBeenCalledOnce()
  })

  it('ignores commands with empty or whitespace names', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const registry = createCommandRegistry()

    registry.register(createCommand(''))
    registry.register(createCommand('   '))
    registry.register(createCommand('blog read'))

    expect(registry.all()).toEqual([])
    expect(warn).toHaveBeenCalledTimes(3)
  })

  it('registers many commands at once', () => {
    const registry = createCommandRegistry()

    registry.registerAll([createCommand('echo'), createCommand('help'), createCommand('clear')])

    expect(registry.all().map((command) => command.name)).toEqual(['echo', 'help', 'clear'])
  })
})
