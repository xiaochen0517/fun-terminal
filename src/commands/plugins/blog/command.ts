/**
 * blog 命令入口
 *
 * 单条 `blog` 命令 + 4 个子命令；只负责分发与「缺失 / 未知子命令」，
 * 各子命令自行校验参数与选项。
 */

import type { Command } from '@/terminal/context/CommandContext'

import { fail } from './format'
import { runList } from './list'
import { runRead } from './read'
import { runTag } from './tag'
import { runTags } from './tags'

const SUBCOMMANDS = 'list / read / tags / tag'
const USAGE = 'blog <list|read|tags|tag> [参数]'

export const blogCommand: Command = {
  name: 'blog',
  description: '浏览博客文章（list / read / tags / tag）',
  usage: USAGE,
  async execute(ctx) {
    const subcommand = ctx.args[0]
    if (!subcommand) {
      fail(
        ctx,
        `blog: 缺少子命令（可用: ${SUBCOMMANDS}，输入 help blog 查看用法）`,
      )
      return
    }

    switch (subcommand) {
      case 'list':
        return runList(ctx)
      case 'read':
        return runRead(ctx)
      case 'tags':
        return runTags(ctx)
      case 'tag':
        return runTag(ctx)
      default:
        fail(
          ctx,
          `blog: 未知子命令: ${subcommand}（可用: ${SUBCOMMANDS}，输入 help blog 查看用法）`,
        )
    }
  },
}
