/**
 * cat 命令
 *
 * 逐个读取文本文件：原样保留内容，文件末尾无换行时补一个；`-n` 为每行加
 * 6 位右对齐行号 + 制表符，多文件连续编号。
 *
 * 图片 / 二进制按「`meta.mime` → 扩展名 → NUL 嗅探」分类；单文件超过
 * 200 KB（UTF-8 字节）直接拒绝。所有错误走 `error` 块，命令从不 throw。
 */

import { rejectUnknownOptions, resolvePathArgument } from '@/commands/path-argument'
import type { VfsNode } from '@/fs/vfs'
import type { Command, CommandContext } from '@/terminal/context/CommandContext'

const MAX_TEXT_BYTES = 200 * 1024
const LINE_NUMBER_WIDTH = 6

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
const BINARY_EXTENSIONS = new Set([
  'pdf',
  'zip',
  'gz',
  'tar',
  'rar',
  '7z',
  'mp3',
  'mp4',
  'wav',
  'webm',
  'ogg',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'wasm',
  'exe',
  'dll',
  'bin',
  'dat',
])
const TEXT_MIME = /^(?:text\/|application\/(?:json|xml|javascript|x-yaml|yaml)$)/

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).byteLength
}

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.')
  return index <= 0 ? '' : name.slice(index + 1).toLowerCase()
}

function classify(node: VfsNode): 'text' | 'image' | 'binary' {
  const mime = node.meta?.mime
  if (mime) {
    if (mime.startsWith('image/')) return 'image'
    if (TEXT_MIME.test(mime)) return 'text'
    return 'binary'
  }

  const extension = extensionOf(node.name)
  if (IMAGE_EXTENSIONS.has(extension)) return 'image'
  if (BINARY_EXTENSIONS.has(extension)) return 'binary'
  // 其余（含文本扩展名与无扩展名）按内容判断：含 NUL 视为二进制
  return (node.content ?? '').includes('\0') ? 'binary' : 'text'
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`
}

function numberLines(content: string, start: number): { text: string; next: number } {
  const lines = ensureTrailingNewline(content).split('\n')
  if (lines[lines.length - 1] === '') lines.pop()

  let counter = start
  const text = lines
    .map((line) => {
      const numbered = `${String(counter).padStart(LINE_NUMBER_WIDTH)}\t${line}`
      counter += 1
      return numbered
    })
    .join('\n')

  return { text: text === '' ? '' : `${text}\n`, next: counter }
}

function fail(ctx: CommandContext, content: string) {
  ctx.output.push({ type: 'error', content })
}

export const catCommand: Command = {
  name: 'cat',
  description: '查看文本文件内容',
  usage: 'cat [-n] <文件...>',
  execute(ctx) {
    const optionError = rejectUnknownOptions('cat', ctx.options, ['-n'])
    if (optionError) {
      fail(ctx, optionError)
      return
    }

    if (ctx.args.length === 0) {
      fail(ctx, 'cat: 缺少文件参数（用法: cat [-n] <文件...>）')
      return
    }

    const numbered = Boolean(ctx.options['-n'])
    let lineNumber = 1

    for (const argument of ctx.args) {
      const resolved = resolvePathArgument('cat', argument, ctx)
      if (!resolved.ok) {
        fail(ctx, resolved.message)
        continue
      }

      const { node } = ctx.vfs.resolve(resolved.target)
      if (!node) {
        fail(ctx, `cat: ${argument}: 文件不存在`)
        continue
      }
      if (node.type === 'directory') {
        fail(ctx, `cat: ${argument}: 是一个目录`)
        continue
      }

      const kind = classify(node)
      if (kind === 'image') {
        fail(ctx, `cat: ${argument}: 图片文件无法以文本方式显示，请使用 img 查看`)
        continue
      }
      if (kind === 'binary') {
        fail(ctx, `cat: ${argument}: 二进制文件，无法以文本方式显示`)
        continue
      }

      const content = node.content ?? ''
      if (utf8Bytes(content) > MAX_TEXT_BYTES) {
        fail(ctx, `cat: ${argument}: 文件过大（超过 200 KB），无法显示`)
        continue
      }
      if (content === '') continue

      if (numbered) {
        const result = numberLines(content, lineNumber)
        lineNumber = result.next
        if (result.text !== '') ctx.output.write(result.text)
      } else {
        ctx.output.write(ensureTrailingNewline(content))
      }
    }
  },
}
