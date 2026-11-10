import { vi } from 'vitest'

import type { DataSource } from '@/data/DataSource'
import { createFileSystem } from '@/fs'
import type { CommandContext } from '@/terminal/context/CommandContext'
import { createOutputBuffer } from '@/terminal/context/buffer'
import type { OutputChunk } from '@/terminal/context/OutputBuffer'

export const testDataSource: DataSource = {
  async fetchArticleList() {
    return []
  },
  async fetchArticle() {
    return null
  },
}

/** 为命令单测构造最小 CommandContext 与内存输出缓冲 */
export function createTestContext(
  overrides: Partial<CommandContext> = {},
): { context: CommandContext; chunks: OutputChunk[] } {
  const chunks: OutputChunk[] = []
  const output = createOutputBuffer({
    get chunks() {
      return chunks
    },
    append(chunk) {
      chunks.push(chunk)
    },
    clear() {
      chunks.length = 0
    },
  })
  const { vfs, mounts } = createFileSystem()

  const context: CommandContext = {
    args: [],
    options: {},
    cwd: '/home/guest',
    env: { USER: 'guest', HOME: '/home/guest' },
    dataSource: testDataSource,
    output,
    commands: [],
    setCwd: vi.fn<(next: string) => void>(),
    vfs,
    mounts,
    ...overrides,
  }

  return { context, chunks }
}
