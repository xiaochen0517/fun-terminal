import { describe, expect, it, vi } from 'vitest'

import type { GalleryEntry } from '@/data/static/gallery'
import { galleryEntries } from '@/data/static/gallery'
import {
  createGalleryTree,
  GALLERY_MOUNT_TARGET,
} from '@/commands/plugins/image/tree'

function entry(overrides: Partial<GalleryEntry> = {}): GalleryEntry {
  return {
    file: 'missing.png',
    mime: 'image/png',
    title: '缺失图片',
    alt: '缺失图片',
    width: 100,
    height: 100,
    ...overrides,
  }
}

describe('createGalleryTree', () => {
  it('mounts every gallery file with its meta', () => {
    const tree = createGalleryTree()

    expect(GALLERY_MOUNT_TARGET).toBe('/mnt/gallery')
    expect(tree.type).toBe('directory')
    expect(tree.children?.map((child) => child.name)).toEqual([
      'domain-name.png',
      'pluto.jpg',
      'saturn.webp',
    ])

    const domain = tree.children?.find((child) => child.name === 'domain-name.png')
    expect(domain?.type).toBe('file')
    expect(domain?.content).toBe('')
    expect(domain?.meta).toMatchObject({
      mime: 'image/png',
      title: '域名的组成',
      description: 'PNG 示例图：CC0 的域名结构示意图，带说明文字。',
      width: '977',
      height: '358',
    })
    expect(domain?.meta?.src).toMatch(/\.png/)
    expect(domain?.meta?.alt).toContain('域名')
  })

  it('returns an empty directory for an empty manifest', () => {
    const tree = createGalleryTree([])

    expect(tree.type).toBe('directory')
    expect(tree.children).toEqual([])
  })

  it('skips a missing asset and warns once per entry', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const tree = createGalleryTree([entry()])

      expect(tree.children).toEqual([])
      expect(warn).toHaveBeenCalledWith(
        '[fun-terminal] 画廊资源缺失，已跳过: missing.png',
      )
    } finally {
      warn.mockRestore()
    }
  })

  it('rejects duplicate file names', () => {
    const first = galleryEntries[0]!

    expect(() => createGalleryTree([first, first])).toThrow(
      `画廊文件名重复: ${first.file}`,
    )
  })
})
