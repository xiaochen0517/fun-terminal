import { createTestContext } from '@/commands/builtin/__tests__/helpers'
import type { Article, DataSource } from '@/data/DataSource'
import type { CommandContext } from '@/terminal/context/CommandContext'

export const testArticles: Article[] = [
  {
    id: 'vfs-notes',
    title: '在浏览器里造一个文件系统',
    date: '2026-11-10',
    tags: ['技术', '前端', '终端'],
    excerpt: '一个只读虚拟文件系统的设计笔记。',
    content: [
      '# 在浏览器里造一个文件系统',
      '',
      '这个站点的内容不是一堆页面，而是一棵可以被 `ls`、`cat`、`cd` 遍历的目录树。',
      '',
      '## 为什么需要 VFS',
      '',
      '1. 命令层不关心内容从哪里来。',
      '2. 挂载点可以替换。',
      '',
      '```ts',
      'const resolved = vfs.resolve(path)',
      '```',
      '',
      '> 只读契约让挂载与命令彼此独立。',
      '',
    ].join('\n'),
  },
  {
    id: 'about',
    title: '关于本站与作者',
    date: '2026-11-08',
    tags: ['公告', '随笔'],
    excerpt: '关于作者与这个站点的技术取舍。',
    content: [
      '# 关于本站与作者',
      '',
      '这是一个以终端为入口的个人站点，使用 [Vue](https://vuejs.org/) 构建。',
      '',
      '## 关于我',
      '',
      '| 项目 | 说明 |',
      '| --- | --- |',
      '| 形态 | 终端 |',
      '| 技术 | Vue |',
      '',
      '> 内容会持续更新。',
      '',
    ].join('\n'),
  },
  {
    id: 'hello',
    title: '你好，终端',
    date: '2026-11-06',
    tags: ['公告', '入门'],
    excerpt: '第一次进来可以先敲哪几条命令。',
    content: [
      '# 你好，终端',
      '',
      '如果你看到这一行，说明你已经在一个终端里读博客了。',
      '',
      '## 可以这样开始',
      '',
      '- 输入 `help` 查看命令。',
      '- 输入 `blog list` 查看文章。',
      '',
    ].join('\n'),
  },
]

function copySummary(article: Article) {
  return {
    id: article.id,
    title: article.title,
    ...(article.excerpt ? { excerpt: article.excerpt } : {}),
    ...(article.date ? { date: article.date } : {}),
    ...(article.tags ? { tags: [...article.tags] } : {}),
  }
}

/** 伪造数据源：列表按日期倒序（与 M7 catalog 的排序一致） */
export function createTestDataSource(articles: readonly Article[] = testArticles): DataSource {
  return {
    async fetchArticleList() {
      return articles.map(copySummary)
    },
    async fetchArticle(id: string) {
      const article = articles.find((item) => item.id === id)
      return article ? { ...copySummary(article), content: article.content } : null
    },
  }
}

export function createBlogContext(
  overrides: Partial<CommandContext> = {},
): ReturnType<typeof createTestContext> {
  return createTestContext({
    dataSource: createTestDataSource(),
    ...overrides,
  })
}
