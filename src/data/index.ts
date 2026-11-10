/**
 * 数据出口
 *
 * M2 占位数据源：命令上下文要求 ctx.dataSource 存在，但本期没有任何命令读取数据。
 * M7 将替换为 StaticDataSource 单例（导出名 dataSource 保持不变），
 * 命令层与 Store 无需改动。
 */

import type { DataSource } from '@/data/DataSource'

export const dataSource: DataSource = {
  async fetchArticleList() {
    return []
  },
  async fetchArticle() {
    return null
  },
}
