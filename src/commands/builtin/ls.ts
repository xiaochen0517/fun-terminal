/**
 * ls 命令
 *
 * 处理顺序：选项校验 → 逐参数解析 → 目录/文件格式化 → 输出。
 * 目录默认单列、目录名追加 `/`；`-a` 显示隐藏条目与 `.` / `..`；
 * `-l` 输出「固定权限位 + UTF-8 字节数 + 名称」；外部资源（`meta.src`，
 * 如图片）不保存正文，大小列显示 `-`。
 *
 * 路径解析统一走 `resolvePathArgument` 与 `ctx.vfs.resolve`，命令内不复写
 * `.` / `..` / 反斜杠规则；输出只写 `text` / `error`，不产生 `html`。
 */

import { rejectUnknownOptions, resolvePathArgument } from '@/commands/path-argument'
import type { VfsNode } from '@/fs/vfs'
import type { Command, CommandContext } from '@/terminal/context/CommandContext'

const DIRECTORY_PERMISSIONS = 'drwxr-xr-x'
const FILE_PERMISSIONS = '-rw-r--r--'
const MIN_SIZE_WIDTH = 6
const NAME_COLLATOR = new Intl.Collator('zh-Hans-CN', { numeric: true })

interface LsOperand {
  argument: string
  node: VfsNode | null
  error?: string
}

interface FormatOptions {
  showAll: boolean
  longFormat: boolean
  sizeWidth: number
}

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).byteLength
}

function sizeOf(node: VfsNode): string {
  if (node.type !== 'file') return '-'
  // 外部资源（如图片，正文不在 VFS 内）无法得知字节数，显示占位符而非伪造 0
  if (node.meta?.src) return '-'
  return String(utf8Bytes(node.content ?? ''))
}

function sortedChildren(node: VfsNode, showAll: boolean): VfsNode[] {
  const children = node.children ?? []
  const visible = showAll ? [...children] : children.filter((child) => !child.name.startsWith('.'))
  return visible.sort((left, right) => NAME_COLLATOR.compare(left.name, right.name))
}

function formatEntry(
  node: VfsNode,
  displayName: string,
  addDirectorySlash: boolean,
  options: FormatOptions,
): string {
  const name = `${displayName}${addDirectorySlash && node.type === 'directory' ? '/' : ''}`
  if (!options.longFormat) return name

  const permissions = node.type === 'directory' ? DIRECTORY_PERMISSIONS : FILE_PERMISSIONS
  return `${permissions}  ${sizeOf(node).padStart(options.sizeWidth)}  ${name}`
}

function formatDotEntry(name: string, options: FormatOptions): string {
  if (!options.longFormat) return name
  return `${DIRECTORY_PERMISSIONS}  ${'-'.padStart(options.sizeWidth)}  ${name}`
}

function formatDirectory(node: VfsNode, options: FormatOptions): string[] {
  const lines: string[] = []

  if (options.showAll) {
    lines.push(formatDotEntry('.', options))
    if (node.parent !== null) lines.push(formatDotEntry('..', options))
  }

  for (const child of sortedChildren(node, options.showAll)) {
    lines.push(formatEntry(child, child.name, true, options))
  }

  return lines
}

function measureSizeWidth(operands: readonly LsOperand[], showAll: boolean): number {
  let width = MIN_SIZE_WIDTH

  for (const operand of operands) {
    if (!operand.node) continue
    if (operand.node.type === 'file') {
      width = Math.max(width, sizeOf(operand.node).length)
      continue
    }

    const children = showAll
      ? (operand.node.children ?? [])
      : (operand.node.children ?? []).filter((child) => !child.name.startsWith('.'))
    for (const child of children) {
      width = Math.max(width, sizeOf(child).length)
    }
  }

  return width
}

function collectOperands(ctx: CommandContext): LsOperand[] {
  const args = ctx.args.length > 0 ? ctx.args : [ctx.cwd]

  return args.map((argument) => {
    const resolved = resolvePathArgument('ls', argument, ctx)
    if (!resolved.ok) return { argument, node: null, error: resolved.message }

    const { node } = ctx.vfs.resolve(resolved.target)
    if (!node) {
      return { argument, node: null, error: `ls: 无法访问 ${argument}: 目录不存在` }
    }
    return { argument, node }
  })
}

export const lsCommand: Command = {
  name: 'ls',
  description: '列出目录内容',
  usage: 'ls [-a] [-l] [路径...]',
  execute(ctx) {
    const optionError = rejectUnknownOptions('ls', ctx.options, ['-a', '-l'])
    if (optionError) {
      ctx.output.push({ type: 'error', content: optionError })
      return
    }

    const options: FormatOptions = {
      showAll: Boolean(ctx.options['-a']),
      longFormat: Boolean(ctx.options['-l']),
      sizeWidth: 0,
    }
    const operands = collectOperands(ctx)
    const multiple = operands.length > 1
    const hasDirectory = operands.some((operand) => operand.node?.type === 'directory')
    if (options.longFormat) {
      options.sizeWidth = measureSizeWidth(operands, options.showAll)
    }

    const separator = (wroteText: boolean) => (wroteText && hasDirectory ? '\n' : '')
    let wroteText = false

    for (const operand of operands) {
      if (operand.error) {
        ctx.output.push({ type: 'error', content: operand.error })
        continue
      }

      const node = operand.node
      if (!node) continue

      if (node.type === 'directory') {
        const lines = formatDirectory(node, options)
        if (lines.length === 0) {
          if (multiple) {
            ctx.output.write(`${separator(wroteText)}${operand.argument}:`)
            wroteText = true
          }
          continue
        }

        const header = multiple ? `${operand.argument}:\n` : ''
        ctx.output.write(`${separator(wroteText)}${header}${lines.join('\n')}`)
        wroteText = true
        continue
      }

      ctx.output.write(
        `${separator(wroteText)}${formatEntry(node, operand.argument, false, options)}`,
      )
      wroteText = true
    }
  },
}
