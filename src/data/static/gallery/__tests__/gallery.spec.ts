import { describe, expect, it } from 'vitest'

import {
  galleryAssetFiles,
  galleryEntries,
  resolveGallerySrc,
} from '@/data/static/gallery'

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
}

const FILE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/

describe('gallery entries', () => {
  it('registers exactly the image files present in the gallery directory', () => {
    const manifest = galleryEntries.map((entry) => entry.file).sort()
    expect([...galleryAssetFiles()].sort()).toEqual(manifest)
  })

  it('uses unique, kebab-case file names with a supported extension', () => {
    const files = galleryEntries.map((entry) => entry.file)
    expect(new Set(files).size).toBe(files.length)
    for (const file of files) {
      expect(file).toMatch(FILE_PATTERN)
    }
  })

  it('matches the MIME type to the file extension', () => {
    for (const entry of galleryEntries) {
      const extension = entry.file.slice(entry.file.lastIndexOf('.') + 1)
      expect(entry.mime).toBe(MIME_BY_EXTENSION[extension])
    }
  })

  it('has non-empty title / alt and positive dimensions', () => {
    for (const entry of galleryEntries) {
      expect(entry.title.trim()).not.toBe('')
      expect(entry.alt.trim()).not.toBe('')
      expect(entry.title.length).toBeLessThanOrEqual(80)
      expect(entry.alt.length).toBeLessThanOrEqual(200)
      expect(Number.isInteger(entry.width) && entry.width > 0).toBe(true)
      expect(Number.isInteger(entry.height) && entry.height > 0).toBe(true)
    }
  })

  it('resolves every entry to a non-empty, non-data asset URL', () => {
    for (const entry of galleryEntries) {
      const src = resolveGallerySrc(entry.file)
      expect(src).toBeTruthy()
      expect(src?.startsWith('/') || src?.startsWith('./')).toBe(true)
      expect(src?.startsWith('data:')).toBe(false)
    }
  })

  it('returns null for an unregistered file', () => {
    expect(resolveGallerySrc('missing.png')).toBeNull()
  })

  it('freezes the manifest and its entries', () => {
    expect(Object.isFrozen(galleryEntries)).toBe(true)
    for (const entry of galleryEntries) {
      expect(Object.isFrozen(entry)).toBe(true)
    }
  })
})
