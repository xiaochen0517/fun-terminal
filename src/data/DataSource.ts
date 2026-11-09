/**
 * 数据访问抽象（DataSource）
 *
 * 统一封装数据获取，向上层命令提供数据，向下屏蔽数据来源差异。
 * 一期提供 StaticDataSource 实现（读取打包内静态数据），
 * 后期可替换为 ApiDataSource 实现（对接后端），命令层无需改动。
 *
 * 本文件仅定义接口与相关类型，具体实现留待功能开发阶段。
 */

/** 博客文章摘要（用于列表展示） */
export interface ArticleSummary {
  /** 文章唯一标识 */
  id: string
  /** 文章标题 */
  title: string
  /** 摘要/简介（可选） */
  excerpt?: string
  /** 发布日期 */
  date?: string
  /** 标签（可选） */
  tags?: string[]
}

/** 博客文章完整内容 */
export interface Article extends ArticleSummary {
  /** 文章正文（Markdown 原文） */
  content: string
}

/** 数据源接口 */
export interface DataSource {
  /** 获取文章列表 */
  fetchArticleList(): Promise<ArticleSummary[]>
  /** 根据 id 获取文章完整内容，不存在时返回 null */
  fetchArticle(id: string): Promise<Article | null>
}
