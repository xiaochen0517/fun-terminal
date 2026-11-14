/**
 * Tab 补全（M10）
 *
 * 纯函数，不依赖 Vue / Store / DOM：
 * - 输入首词（无空格）→ 命令名补全；
 * - 其后（有空格）→ 对最后一个空白分隔的 token 做路径补全（只读 VFS）。
 *
 * 路径补全支持 `~` 展开、相对路径（基于 cwd）与目录 `/` 后缀；
 * 默认不列出隐藏文件（名字以 `.` 开头），除非输入的名字前缀本身以 `.` 开头。
 */

import { resolve } from '@/fs/path'
import type { Vfs } from '@/fs/vfs'

/** 与 `ls` / `help` 保持一致的名称排序 */
const NAME_COLLATOR = new Intl.Collator('zh-Hans-CN', { numeric: true })

export interface CompletionOptions {
  commands: readonly string[]
  cwd: string
  vfs: Vfs
  homeDir: string
}

export type CompletionResult =
  | { type: 'complete'; value: string }
  | { type: 'list'; value: string; candidates: readonly string[] }
  | { type: 'none' }

export function complete(input: string, options: CompletionOptions): CompletionResult {
  if (input === '') return { type: 'none' }
  if (!input.includes(' ')) return completeCommandName(input, options.commands)
  return completePath(input, options)
}

function completeCommandName(prefix: string, commands: readonly string[]): CompletionResult {
  const matches = [...commands].filter((name) => name.startsWith(prefix)).sort(compareName)
  if (matches.length === 0) return { type: 'none' }
  if (matches.length === 1) return { type: 'complete', value: `${matches[0]!} ` }
  return { type: 'list', value: longestCommonPrefix(matches), candidates: matches }
}

function completePath(input: string, options: CompletionOptions): CompletionResult {
  const { cwd, vfs, homeDir } = options
  const lastSpace = input.lastIndexOf(' ')
  const before = input.slice(0, lastSpace + 1)
  const token = input.slice(lastSpace + 1)

  // 目录展示形态（保留 ~ / 相对形态）与名字前缀
  let displayDir: string
  let namePrefix: string
  if (token === '~') {
    displayDir = '~/'
    namePrefix = ''
  } else {
    const slash = token.lastIndexOf('/')
    displayDir = slash === -1 ? '' : token.slice(0, slash + 1)
    namePrefix = slash === -1 ? token : token.slice(slash + 1)
  }

  const dir = resolve(cwd, expandTilde(displayDir, homeDir))
  const children = vfs.readDir(dir)
  if (!children) return { type: 'none' }

  const pool = namePrefix.startsWith('.')
    ? children
    : children.filter((child) => !child.name.startsWith('.'))
  const matches = pool
    .filter((child) => child.name.startsWith(namePrefix))
    .sort((left, right) => NAME_COLLATOR.compare(left.name, right.name))
  if (matches.length === 0) return { type: 'none' }

  const names = matches.map((child) =>
    child.type === 'directory' ? `${child.name}/` : child.name,
  )

  if (matches.length === 1) {
    const suffix = matches[0]!.type === 'directory' ? '/' : ''
    return { type: 'complete', value: before + displayDir + matches[0]!.name + suffix }
  }

  const common = longestCommonPrefix(matches.map((child) => child.name))
  return { type: 'list', value: before + displayDir + common, candidates: names }
}

function expandTilde(text: string, homeDir: string): string {
  if (text === '~') return homeDir
  if (text.startsWith('~/')) return homeDir + text.slice(1)
  return text
}

function longestCommonPrefix(values: readonly string[]): string {
  let prefix = values[0] ?? ''
  for (const value of values) {
    while (!value.startsWith(prefix)) prefix = prefix.slice(0, -1)
    if (prefix === '') break
  }
  return prefix
}

function compareName(left: string, right: string): number {
  return NAME_COLLATOR.compare(left, right)
}
