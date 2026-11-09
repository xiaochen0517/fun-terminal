# 博客插件（blog）

提供博客浏览命令（如 `blog list` 列出文章、`blog read <id>` 阅读正文）。

- 数据通过 `DataSource` 抽象访问，一期为 `StaticDataSource`（读取静态 Markdown 文件）。
- 支持两种查看方式：富文本（md 渲染）与纯文本（`cat`）。

功能开发阶段实现。
