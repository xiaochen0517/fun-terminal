/**
 * img 命令
 *
 * `img <图片路径>`：解析路径 → 读取 VFS 节点 → 校验图片格式与 `meta.src` →
 * 输出 `<figure class="img">` 富文本（html chunk），由 `.img` 样式负责响应式尺寸。
 *
 * 命令只依赖 CommandContext；不 import Store / window / fetch / 画廊清单，
 * 因此可用任意合成节点做纯单测。
 */

import { rejectUnknownOptions, resolvePathArgument } from '@/commands/path-argument'
import type { VfsNode } from '@/fs/vfs'
import { escapeHtml } from '@/markdown/escape'
import type { Command, CommandContext } from '@/terminal/context/CommandContext'

/** 与 cat.ts 的 IMAGE_EXTENSIONS 保持一致，避免 cat 引导到不可用的 img */
const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'avif',
])

const IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/x-icon',
  'image/avif',
])

/** 明确是图片但当前不支持的格式 */
const IMAGE_LIKE_EXTENSIONS = new Set(['tif', 'tiff', 'heic', 'heif'])

const SUPPORTED_FORMATS = 'png / jpg / jpeg / gif / webp / svg / bmp / ico / avif'
const MAX_SRC_LENGTH = 2048
const MAX_DIMENSION = 10000

/** 只允许同源路径、`./` 相对路径与 http(s)；拒绝 data: / javascript: / // 等 */
const SAFE_SRC = /^(?:\/(?!\/)|\.\/|https?:\/\/)/i

/** 图片渲染所需信息（全部来自 VFS 节点 meta） */
interface ImagePresentation {
  src: string
  alt: string
  title: string
  description?: string
  width?: number
  height?: number
}

type ImageReadResult =
  | { ok: true; value: ImagePresentation }
  | { ok: false; message: string }

function fail(ctx: CommandContext, message: string): void {
  ctx.output.push({ type: 'error', content: message })
}

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.')
  return index <= 0 ? '' : name.slice(index + 1).toLowerCase()
}

/** 扩展名或 mime 任一命中即支持；image/* 的其他格式归入「不支持的图片格式」 */
function classifyImage(node: VfsNode): 'supported' | 'unsupported' | 'not-image' {
  const mime = (node.meta?.mime ?? '').toLowerCase()
  const extension = extensionOf(node.name)

  if (IMAGE_EXTENSIONS.has(extension) || IMAGE_MIMES.has(mime)) return 'supported'
  if (mime.startsWith('image/') || IMAGE_LIKE_EXTENSIONS.has(extension)) return 'unsupported'
  return 'not-image'
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code <= 0x1f || code === 0x7f) return true
  }
  return false
}

function isSafeImageSrc(src: string): boolean {
  const value = src.trim()
  if (value === '' || value.length > MAX_SRC_LENGTH) return false
  if (hasControlCharacter(value)) return false
  if (/\s/.test(value)) return false
  return SAFE_SRC.test(value)
}

function positiveDimension(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return undefined
  const dimension = Number(trimmed)
  if (!Number.isInteger(dimension) || dimension <= 0 || dimension > MAX_DIMENSION) {
    return undefined
  }
  return dimension
}

function readImage(node: VfsNode, argument: string): ImageReadResult {
  const kind = classifyImage(node)
  if (kind === 'not-image') {
    return { ok: false, message: `img: ${argument}: 不是图片文件` }
  }
  if (kind === 'unsupported') {
    return {
      ok: false,
      message: `img: 不支持的图片格式: ${argument}（支持 ${SUPPORTED_FORMATS}）`,
    }
  }

  const src = node.meta?.src?.trim() ?? ''
  if (src === '') {
    return { ok: false, message: `img: 图片资源缺失: ${argument}` }
  }
  if (!isSafeImageSrc(src)) {
    return { ok: false, message: `img: 图片地址不合法: ${argument}` }
  }

  const title = node.meta?.title?.trim() || node.name
  const alt = node.meta?.alt?.trim() || title
  const description = node.meta?.description?.trim() || undefined

  return {
    ok: true,
    value: {
      src,
      alt,
      title,
      description,
      width: positiveDimension(node.meta?.width),
      height: positiveDimension(node.meta?.height),
    },
  }
}

function renderImageFigure(image: ImagePresentation): string {
  const size = [
    image.width ? ` width="${image.width}"` : '',
    image.height ? ` height="${image.height}"` : '',
  ].join('')
  const description = image.description
    ? `<span class="img__desc">${escapeHtml(image.description)}</span>`
    : ''

  return (
    `<figure class="img">` +
    `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}"${size}` +
    ` loading="lazy" decoding="async">` +
    `<figcaption class="img__caption">` +
    `<span class="img__title">${escapeHtml(image.title)}</span>` +
    `${description}` +
    `</figcaption></figure>`
  )
}

export const imgCommand: Command = {
  name: 'img',
  description: '在终端中查看图片（png / jpg / jpeg / gif / webp / svg 等）',
  usage: 'img <图片路径>',
  execute(ctx) {
    const optionError = rejectUnknownOptions('img', ctx.options, [])
    if (optionError) {
      fail(ctx, optionError)
      return
    }

    if (ctx.args.length === 0) {
      fail(ctx, 'img: 缺少图片路径（用法: img <图片路径>）')
      return
    }
    if (ctx.args.length > 1) {
      fail(ctx, 'img: 参数过多（一次只能查看一张图片）')
      return
    }

    const argument = ctx.args[0]!
    const resolved = resolvePathArgument('img', argument, ctx)
    if (!resolved.ok) {
      fail(ctx, resolved.message)
      return
    }

    const { node } = ctx.vfs.resolve(resolved.target)
    if (!node) {
      fail(ctx, `img: 文件不存在: ${argument}`)
      return
    }
    if (node.type === 'directory') {
      fail(ctx, `img: ${argument}: 是一个目录`)
      return
    }

    const image = readImage(node, argument)
    if (!image.ok) {
      fail(ctx, image.message)
      return
    }

    ctx.output.writeHtml(renderImageFigure(image.value))
  },
}
