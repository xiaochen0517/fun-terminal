# 博客插件（blog）

已实现（M8）。`install` 阶段读取 `DataSource`，把文章投影为 `/mnt/blog/<id>.md`；
命令阶段提供：

- `blog list`：按发布日期倒序列出文章；
- `blog read <id>`：Markdown 渲染为 `<article class="md">` 富文本；
- `blog read --raw <id>`：纯文本原文，与 `cat /mnt/blog/<id>.md` 同源；
- `blog tags`：标签及文章数；
- `blog tag <tag>`：按标签过滤。

数据通过 `DataSource` 访问，一期为 `StaticDataSource`（运行时 `fetch` 静态 Markdown）；
插件不直接 import 文章文件，也不直接改 VFS。
