import { describe, expect, it } from 'vitest'

import { formatPromptPath } from '@/terminal/prompt'

describe('formatPromptPath', () => {
  const home = '/home/guest'

  it('renders the home directory as ~', () => {
    expect(formatPromptPath(home, home)).toBe('~')
  })

  it('renders a child of home with the ~ prefix', () => {
    expect(formatPromptPath('/home/guest/blog', home)).toBe('~/blog')
  })

  it('keeps paths outside home absolute', () => {
    expect(formatPromptPath('/mnt/blog', home)).toBe('/mnt/blog')
  })

  it('keeps the root path', () => {
    expect(formatPromptPath('/', home)).toBe('/')
  })

  it('trims trailing slashes', () => {
    expect(formatPromptPath('/home/guest/', home)).toBe('~')
  })

  it('does not treat a prefix sibling as a child of home', () => {
    expect(formatPromptPath('/home/guestx', home)).toBe('/home/guestx')
  })

  it('handles a root home directory', () => {
    expect(formatPromptPath('/', '/')).toBe('~')
    expect(formatPromptPath('/blog', '/')).toBe('~/blog')
  })
})
