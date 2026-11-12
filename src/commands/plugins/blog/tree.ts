/**
 * 博客文章树
 *
 * 把清单 + 正文投影为只读 VFS 子树：`/mnt/blog/<id>.md`。
 * 正文与 `DataSource` 返回的 content 逐字一致；空输入返回空目录，
 * 保证 `/mnt/blog` 始终存在。
 */

import type { Article, ArticleSummary } from '@/data/DataSource'
import { buildTree } from '@/fs/build'
import type { TreeSpec } from '@/fs/build'
import type { VfsNode } from '@/fs/vfs'

/** 博客插件挂载目标 */
export const BLOG_MOUNT_TARGET = '/mnt/blog'

/** 一篇文章的摘要与正文 */
export interface BlogEntry {
  summary: ArticleSummary
  article: Article
}

/** 清单 + 正文 → 只读子树；空输入返回空目录 */
export function createBlogTree(entries: readonly BlogEntry[]): VfsNode {
  const spec: TreeSpec = {}

  for (const { summary, article } of entries) {
    const name = `${summary.id}.md`
    if (Object.prototype.hasOwnProperty.call(spec, name)) {
      throw new Error(`文章 id 重复: ${summary.id}`)
    }

    spec[name] = {
      file: article.content,
      meta: {
        mime: 'text/markdown',
        title: summary.title,
        date: summary.date ?? '',
        tags: (summary.tags ?? []).join(','),
      },
    }
  }

  return buildTree(spec)
}
