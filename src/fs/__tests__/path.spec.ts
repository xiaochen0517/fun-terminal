import { describe, expect, it } from 'vitest'

import { basename, dirname, isAbsolute, join, normalize, resolve } from '@/fs/path'

describe('isAbsolute', () => {
  it('detects POSIX absolute paths', () => {
    expect(isAbsolute('/mnt')).toBe(true)
    expect(isAbsolute('/')).toBe(true)
    expect(isAbsolute('mnt')).toBe(false)
    expect(isAbsolute('')).toBe(false)
  })
})

describe('normalize', () => {
  it('returns the root for empty input', () => {
    expect(normalize('')).toBe('/')
  })

  it('collapses repeated and trailing slashes', () => {
    expect(normalize('/')).toBe('/')
    expect(normalize('//')).toBe('/')
    expect(normalize('/mnt//blog/')).toBe('/mnt/blog')
    expect(normalize('/mnt/blog///')).toBe('/mnt/blog')
  })

  it('drops dot segments', () => {
    expect(normalize('/mnt/./blog')).toBe('/mnt/blog')
    expect(normalize('./mnt/./blog/.')).toBe('/mnt/blog')
  })

  it('resolves parent segments', () => {
    expect(normalize('/mnt/../home/./guest/')).toBe('/home/guest')
    expect(normalize('/a/b/../c')).toBe('/a/c')
  })

  it('stays at the root when parent segments overflow', () => {
    expect(normalize('/..')).toBe('/')
    expect(normalize('/../../x')).toBe('/x')
    expect(normalize('/a/../../b')).toBe('/b')
  })

  it('treats relative input as relative to the root', () => {
    expect(normalize('a/b')).toBe('/a/b')
    expect(normalize('a/../b')).toBe('/b')
  })

  it('normalizes backslashes to slashes', () => {
    expect(normalize('\\mnt\\blog')).toBe('/mnt/blog')
    expect(normalize('/mnt\\blog')).toBe('/mnt/blog')
  })

  it('keeps case untouched', () => {
    expect(normalize('/MNT/Blog')).toBe('/MNT/Blog')
  })

  it('keeps unicode and emoji segments', () => {
    expect(normalize('/mnt/示例/🙂.md')).toBe('/mnt/示例/🙂.md')
  })

  it('does not expand the tilde shorthand', () => {
    expect(normalize('~')).toBe('/~')
    expect(normalize('~/docs')).toBe('/~/docs')
  })
})

describe('join', () => {
  it('joins segments and normalizes the result', () => {
    expect(join('/mnt', 'blog', 'a.md')).toBe('/mnt/blog/a.md')
    expect(join('/', 'home', 'guest')).toBe('/home/guest')
    expect(join('/mnt/', '/blog/', './a.md')).toBe('/mnt/blog/a.md')
  })

  it('returns the root without arguments', () => {
    expect(join()).toBe('/')
  })

  it('collapses parent segments across joined parts', () => {
    expect(join('/home/guest', '..', 'mnt')).toBe('/home/mnt')
  })
})

describe('resolve', () => {
  it('normalizes an absolute target and ignores the base', () => {
    expect(resolve('/home/guest', '/mnt')).toBe('/mnt')
    expect(resolve('/home/guest', '/mnt/../var')).toBe('/var')
  })

  it('resolves a relative target against the base', () => {
    expect(resolve('/home/guest', 'docs')).toBe('/home/guest/docs')
    expect(resolve('/home/guest', '../mnt')).toBe('/home/mnt')
    expect(resolve('/home/guest', './a/./b')).toBe('/home/guest/a/b')
  })

  it('falls back to the base for an empty target', () => {
    expect(resolve('/home/guest', '')).toBe('/home/guest')
    expect(resolve('/home/guest/', '')).toBe('/home/guest')
  })

  it('stays at the root when the relative target overflows', () => {
    expect(resolve('/home/guest', '../../../../x')).toBe('/x')
  })

  it('normalizes backslashes in the target', () => {
    expect(resolve('/home/guest', 'docs\\notes.md')).toBe('/home/guest/docs/notes.md')
  })
})

describe('dirname', () => {
  it('returns the parent directory', () => {
    expect(dirname('/a/b')).toBe('/a')
    expect(dirname('/a/b/c')).toBe('/a/b')
    expect(dirname('/mnt/blog/')).toBe('/mnt')
  })

  it('returns the root for top-level and root paths', () => {
    expect(dirname('/a')).toBe('/')
    expect(dirname('/')).toBe('/')
    expect(dirname('')).toBe('/')
  })
})

describe('basename', () => {
  it('returns the last segment', () => {
    expect(basename('/a/b')).toBe('b')
    expect(basename('/a/b/')).toBe('b')
    expect(basename('/mnt/示例')).toBe('示例')
  })

  it('returns an empty string for the root', () => {
    expect(basename('/')).toBe('')
    expect(basename('')).toBe('')
  })
})
