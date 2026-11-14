import { describe, expect, it } from 'vitest'

import { createTestContext } from '@/commands/builtin/__tests__/helpers'
import { imgCommand } from '@/commands/plugins/image/img'
import { buildTree } from '@/fs/build'
import type { TreeSpec } from '@/fs/build'
import type { OutputChunk } from '@/terminal/context/OutputBuffer'

type ImageMeta = Record<string, string>

const DEFAULT_IMAGES: Record<string, ImageMeta> = {
  'domain-name.png': {
    mime: 'image/png',
    src: '/assets/domain-name.png',
    alt: '一张域名结构示意图',
    title: '域名的组成',
    description: 'PNG 示例图',
    width: '977',
    height: '358',
  },
  'pluto.jpg': {
    mime: 'image/jpeg',
    src: './assets/pluto.jpg',
    alt: '冥王星照片',
    title: '冥王星',
  },
  'saturn.webp': {
    mime: 'image/webp',
    src: 'https://cdn.example.com/saturn.webp',
    alt: '土星照片',
    title: '土星',
  },
}

function createImageTree(images: Record<string, ImageMeta>) {
  const spec: TreeSpec = {}
  for (const [name, meta] of Object.entries(images)) {
    spec[name] = { file: '', meta }
  }
  return buildTree(spec)
}

interface RunOptions {
  cwd?: string
  options?: Record<string, string | boolean>
  images?: Record<string, ImageMeta>
}

function run(
  args: string[],
  { cwd = '/home/guest', options = {}, images = DEFAULT_IMAGES }: RunOptions = {},
): OutputChunk[] {
  const { context, chunks } = createTestContext({ cwd, args, options })
  context.mounts.mount('/mnt/gallery', createImageTree(images))
  imgCommand.execute(context)
  return chunks
}

function lastText(chunks: OutputChunk[]): string {
  const chunk = chunks[chunks.length - 1]
  return chunk?.type === 'html' ? chunk.content : ''
}

function errorOf(chunks: OutputChunk[]): string {
  const chunk = chunks[chunks.length - 1]
  return chunk?.type === 'error' ? chunk.content : ''
}

describe('img command', () => {
  it('renders a figure for a PNG image', () => {
    const chunks = run(['/mnt/gallery/domain-name.png'])

    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.type).toBe('html')

    const html = lastText(chunks)
    expect(html).toContain('<figure class="img">')
    expect(html).toContain('src="/assets/domain-name.png"')
    expect(html).toContain('alt="一张域名结构示意图"')
    expect(html).toContain('width="977"')
    expect(html).toContain('height="358"')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
    expect(html).toContain('<span class="img__title">域名的组成</span>')
    expect(html).toContain('<span class="img__desc">PNG 示例图</span>')
  })

  it('supports JPEG, WebP, relative paths and extension / MIME fallbacks', () => {
    expect(lastText(run(['/mnt/gallery/pluto.jpg']))).toContain('src="./assets/pluto.jpg"')
    expect(lastText(run(['/mnt/gallery/saturn.webp']))).toContain(
      'src="https://cdn.example.com/saturn.webp"',
    )

    const relative = run(['domain-name.png'], { cwd: '/mnt/gallery' })
    expect(lastText(relative)).toContain('src="/assets/domain-name.png"')

    const extensionOnly = run(['/mnt/gallery/plain.svg'], {
      images: { 'plain.svg': { src: '/assets/plain.svg' } },
    })
    expect(lastText(extensionOnly)).toContain('src="/assets/plain.svg"')

    const mimeOnly = run(['/mnt/gallery/no-extension'], {
      images: { 'no-extension': { mime: 'image/png', src: '/assets/no-extension' } },
    })
    expect(lastText(mimeOnly)).toContain('src="/assets/no-extension"')
  })

  it('falls back to the file name and omits an empty description', () => {
    const html = lastText(
      run(['/mnt/gallery/fallback.png'], {
        images: { 'fallback.png': { mime: 'image/png', src: '/assets/fallback.png' } },
      }),
    )

    expect(html).toContain('<span class="img__title">fallback.png</span>')
    expect(html).toContain('alt="fallback.png"')
    expect(html).not.toContain('img__desc')
  })

  it('escapes dynamic text in attributes and captions', () => {
    const html = lastText(
      run(['/mnt/gallery/quoted.png'], {
        images: {
          'quoted.png': {
            mime: 'image/png',
            src: '/assets/quoted.png',
            alt: 'a "b" <c>',
            title: 't "x" <y>',
            description: 'd "z" <w>',
          },
        },
      }),
    )

    expect(html).toContain('alt="a &quot;b&quot; &lt;c&gt;"')
    expect(html).toContain('<span class="img__title">t &quot;x&quot; &lt;y&gt;</span>')
    expect(html).toContain('<span class="img__desc">d &quot;z&quot; &lt;w&gt;</span>')
    expect(html).not.toContain('<c>')
  })

  it('ignores invalid dimensions', () => {
    const html = lastText(
      run(['/mnt/gallery/bad-size.png'], {
        images: {
          'bad-size.png': {
            mime: 'image/png',
            src: '/assets/bad-size.png',
            width: '0',
            height: 'abc',
          },
        },
      }),
    )

    expect(html).not.toContain(' width="')
    expect(html).not.toContain(' height="')
  })

  it('rejects missing arguments, too many arguments and unknown options', () => {
    expect(errorOf(run([]))).toBe('img: 缺少图片路径（用法: img <图片路径>）')
    expect(errorOf(run(['a', 'b']))).toBe('img: 参数过多（一次只能查看一张图片）')
    expect(errorOf(run(['domain-name.png'], { options: { '-f': true } }))).toBe(
      'img: 不支持的选项: -f',
    )
  })

  it('rejects a missing path and a directory', () => {
    expect(errorOf(run(['/mnt/gallery/nope.png']))).toBe(
      'img: 文件不存在: /mnt/gallery/nope.png',
    )
    expect(errorOf(run(['/mnt/gallery']))).toBe('img: /mnt/gallery: 是一个目录')
  })

  it('rejects text files and unsupported image formats', () => {
    expect(errorOf(run(['~/README.md']))).toBe('img: ~/README.md: 不是图片文件')

    expect(
      errorOf(
        run(['/mnt/gallery/photo.tiff'], {
          images: { 'photo.tiff': { mime: 'image/tiff', src: '/assets/photo.tiff' } },
        }),
      ),
    ).toBe(
      'img: 不支持的图片格式: /mnt/gallery/photo.tiff（支持 png / jpg / jpeg / gif / webp / svg / bmp / ico / avif）',
    )
  })

  it('rejects a missing or unsafe src', () => {
    expect(
      errorOf(
        run(['/mnt/gallery/no-src.png'], {
          images: { 'no-src.png': { mime: 'image/png' } },
        }),
      ),
    ).toBe('img: 图片资源缺失: /mnt/gallery/no-src.png')

    for (const src of ['javascript:alert(1)', 'data:image/png;base64,AAAA', '//evil.test/x.png']) {
      expect(
        errorOf(
          run(['/mnt/gallery/bad.png'], {
            images: { 'bad.png': { mime: 'image/png', src } },
          }),
        ),
      ).toBe('img: 图片地址不合法: /mnt/gallery/bad.png')
    }
  })

  it('does not change the session cwd', () => {
    const { context, chunks } = createTestContext({
      cwd: '/mnt/gallery',
      args: ['domain-name.png'],
    })
    context.mounts.mount('/mnt/gallery', createImageTree(DEFAULT_IMAGES))

    imgCommand.execute(context)

    expect(context.cwd).toBe('/mnt/gallery')
    expect(chunks[chunks.length - 1]?.type).toBe('html')
  })
})
