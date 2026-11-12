/**
 * 博客插件
 *
 * `install` 阶段从 `DataSource` 预取清单与正文，投影为 `/mnt/blog`；
 * 命令执行期只通过 `ctx.dataSource` 读取，因此挂载失败也不影响 `blog read`。
 */

import type { CommandPlugin } from '@/commands/CommandPlugin'

import { blogCommand } from './command'
import { BLOG_MOUNT_TARGET, createBlogTree } from './tree'
import type { BlogEntry } from './tree'

export const blogPlugin: CommandPlugin = {
  id: 'blog',
  commands: [blogCommand],
  async install(api) {
    const summaries = await api.dataSource.fetchArticleList()
    const entries: BlogEntry[] = []

    for (const summary of summaries) {
      const article = await api.dataSource.fetchArticle(summary.id)
      if (article) entries.push({ summary, article })
    }

    // 空清单也挂空目录；mount 失败只由 MountApi 告警，不阻断命令注册
    api.mounts.mount(BLOG_MOUNT_TARGET, createBlogTree(entries))
  },
}
