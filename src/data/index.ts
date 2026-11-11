/**
 * 数据出口
 *
 * M7 起导出应用级 `StaticDataSource` 单例：元数据与正文作为静态资源发布，
 * 运行时按需 `fetch`（见 `src/data/static/StaticDataSource.ts`）。
 * 命令与插件通过 `CommandContext.dataSource` / `PluginApi.dataSource` 使用，
 * 不直接访问静态资源；未来切换 `ApiDataSource` 时只改本文件。
 */

import type { DataSource } from '@/data/DataSource'
import { createStaticDataSource } from '@/data/static/StaticDataSource'

/** 应用级数据源单例 */
export const dataSource: DataSource = createStaticDataSource()
