import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'

import Terminal from '@/terminal/components/Terminal.vue'
import { commandRuntime } from '@/commands'
import { siteConfig } from '@/config/site'
import { useTerminalStore } from '@/stores/terminal'

describe('Terminal', () => {
  let wrapper: VueWrapper
  let store: ReturnType<typeof useTerminalStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    wrapper = mount(Terminal, {
      attachTo: document.body,
      global: { plugins: [pinia] },
    })
    store = useTerminalStore()
  })

  afterEach(() => {
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  function input() {
    return wrapper.get('textarea')
  }

  function inputValue() {
    return (input().element as HTMLTextAreaElement).value
  }

  async function submit(value: string) {
    await input().setValue(value)
    await input().trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await nextTick()
  }

  it('renders the banner, welcome message and prompt', () => {
    expect(wrapper.text()).toContain(siteConfig.banner[0])
    expect(wrapper.text()).toContain('欢迎来到 fun-terminal')
    expect(wrapper.text()).toContain('guest@fun-terminal')
    expect(wrapper.text()).toContain('~')
  })

  it('mirrors typed input', async () => {
    await input().setValue('hello')
    await nextTick()

    expect(wrapper.get('.terminal-input__mirror').text()).toContain('hello')
  })

  it('renders the block cursor without inserting extra whitespace', async () => {
    const field = input()
    await field.trigger('focus')
    await field.setValue('hello')

    const el = field.element as HTMLTextAreaElement
    el.setSelectionRange(5, 5)
    await field.trigger('select')
    await nextTick()

    expect(wrapper.get('.terminal-input__mirror').element.textContent).toBe('hello ')
  })

  it('echoes a submitted command and renders its output', async () => {
    await submit('echo hello world')

    expect(store.history).toEqual(['echo hello world'])
    expect(wrapper.findAll('.terminal-chunk--command')).toHaveLength(1)
    expect(wrapper.findAll('.terminal-chunk--text')).toHaveLength(1)
    expect(wrapper.text()).toContain('hello world')
    expect(inputValue()).toBe('')
  })

  it('renders an image html chunk from the img command', async () => {
    await submit('img /mnt/gallery/domain-name.png')

    expect(wrapper.findAll('.terminal-chunk--html')).toHaveLength(1)
    const image = wrapper.get('figure.img img')
    expect(image.attributes('src')).toBeTruthy()
    expect(image.attributes('src')?.startsWith('data:')).toBe(false)
    expect(image.attributes('alt')).toContain('域名')
    expect(image.attributes('width')).toBe('977')
    expect(image.attributes('height')).toBe('358')
    expect(inputValue()).toBe('')
  })

  it('scrolls to the bottom when an image finishes loading', async () => {
    await submit('img /mnt/gallery/pluto.jpg')

    const scroll = wrapper.get('.terminal__scroll').element as HTMLElement
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 1200 })
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 600 })
    scroll.scrollTop = 0

    await wrapper.get('figure.img img').trigger('load')
    await nextTick()

    expect(scroll.scrollTop).toBe(1200)
  })

  it('renders an error for unknown commands and keeps the session usable', async () => {
    await submit('nope')

    expect(wrapper.text()).toContain('nope: 未找到命令')
    expect(wrapper.findAll('.terminal-chunk--error')).toHaveLength(1)

    await submit('echo still works')

    expect(wrapper.text()).toContain('still works')
  })

  it('normalizes pasted line breaks to spaces', async () => {
    await input().setValue('one\ntwo')
    await nextTick()

    expect(inputValue()).toBe('one two')
  })

  it('ignores an empty submission', async () => {
    const before = store.chunks.length
    await submit('   ')

    expect(store.history).toEqual([])
    expect(store.chunks).toHaveLength(before)
  })

  it('navigates history and restores the draft', async () => {
    await submit('one')
    await submit('two')

    await input().trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(inputValue()).toBe('two')

    await input().trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(inputValue()).toBe('one')

    await input().trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(inputValue()).toBe('two')

    await input().trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(inputValue()).toBe('')
  })

  it('preserves a typed draft while browsing history', async () => {
    await submit('echo one')
    await input().setValue('draft')

    await input().trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(inputValue()).toBe('echo one')

    await input().trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(inputValue()).toBe('draft')
  })

  it('clears output with clear but keeps history', async () => {
    await submit('echo one')
    await submit('clear')

    expect(store.chunks).toEqual([])
    expect(store.history).toEqual(['echo one', 'clear'])
    expect(wrapper.findAll('.terminal-chunk')).toHaveLength(0)
  })

  it('completes a unique command name on Tab', async () => {
    await input().setValue('ech')
    await input().trigger('keydown', { key: 'Tab' })
    await nextTick()

    expect(inputValue()).toBe('echo ')
  })

  it('lists candidates on Tab when multiple commands match', async () => {
    await input().setValue('c')
    await input().trigger('keydown', { key: 'Tab' })
    await nextTick()

    expect(inputValue()).toBe('c')
    expect(store.chunks[store.chunks.length - 1]).toEqual({
      type: 'system',
      content: '候选：cat  cd  clear',
    })
  })

  it('completes a path on Tab', async () => {
    await commandRuntime.ready
    await input().setValue('cat /mnt/b')
    await input().trigger('keydown', { key: 'Tab' })
    await nextTick()

    expect(inputValue()).toBe('cat /mnt/blog/')
  })

  it('does nothing on Tab when nothing matches', async () => {
    await input().setValue('zz')
    const before = store.chunks.length
    await input().trigger('keydown', { key: 'Tab' })
    await nextTick()

    expect(inputValue()).toBe('zz')
    expect(store.chunks).toHaveLength(before)
  })

  it('clears output with Ctrl+L but keeps the input', async () => {
    await input().setValue('echo hello')
    await input().trigger('keydown', { key: 'l', ctrlKey: true })
    await nextTick()

    expect(store.chunks).toHaveLength(0)
    expect(inputValue()).toBe('echo hello')
  })

  it('cancels input with Ctrl+C without submitting', async () => {
    await input().setValue('abc')
    const before = store.chunks.length
    await input().trigger('keydown', { key: 'c', ctrlKey: true })
    await nextTick()

    expect(inputValue()).toBe('')
    expect(store.history).toEqual([])
    expect(store.chunks).toHaveLength(before)
  })
})
