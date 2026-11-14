# 图片查看插件（image）

已实现（M9）。`install` 阶段把构建期示例画廊挂载到 `/mnt/gallery`，并注册 `img` 命令。

- `img <图片路径>`：读取 VFS 节点，按 `meta.mime` / 扩展名识别图片，输出 `<figure class="img">`（`html` chunk）；
- 图片节点由 `meta.src` 指向构建期资源 URL，`meta.mime` / `alt` / `title` / `description` / `width` / `height` 提供展示信息；
- `cat` 对图片提示「请使用 img 查看」；`ls -l` 对外部资源的大小列显示 `-`。

示例素材在 `src/data/static/gallery/`，来源与许可见该目录 `README.md`；插件不直接 import 图片文件，也不直接改 VFS。
