# fun-terminal

以「模拟终端」为唯一交互入口的个人站点。访客通过类 Linux 命令行浏览站内内容：目录（`ls` / `cd`）、文本（`cat`）、博客（`blog`）、图片（`img`）。

## 技术栈

- Vue 3 + Vite + TypeScript + Pinia
- 自研轻量终端渲染（不依赖 xterm.js）
- `markdown-it` 渲染博客 Markdown 正文
- Vitest + @vue/test-utils 单元/组件测试

## 命令清单

| 命令 | 类别 | 说明 |
| --- | --- | --- |
| `echo` | 核心 | 输出传入的文本 |
| `help` | 核心 | 查看可用命令与用法 |
| `clear` | 核心 | 清空终端输出（保留历史） |
| `pwd` | 核心 | 显示当前虚拟工作目录 |
| `cd` | 核心 | 切换虚拟目录（支持 `~` / `.` / `..`） |
| `history` | 核心 | 查看命令历史 |
| `ls` | 核心 | 列出目录内容（`-a` / `-l` / 多路径） |
| `cat` | 核心 | 读取文本文件（`-n` / 多文件 / 图片与二进制提示） |
| `mount` / `unmount` | 插件（demo） | 运行时挂载 / 卸载示例挂载点 `/mnt/demo` |
| `blog` | 插件（blog） | 浏览博客：`list` / `read` / `read --raw` / `tags` / `tag` |
| `img` | 插件（image） | 在终端中查看图片（挂载 `/mnt/gallery`） |

交互：`Tab` 补全命令名与路径；`↑` / `↓` 浏览历史；`Ctrl+L` 清屏、`Ctrl+C` 取消当前输入。

## 本地开发

```sh
npm install
npm run dev
```

## 构建与部署

```sh
npm run build        # 类型检查 + 生产构建（产物在 dist/）
npm run preview      # 本地预览构建产物
```

默认部署到**根路径**。子路径部署（如 GitHub Pages）时通过 `VITE_BASE_PATH` 指定：

```sh
VITE_BASE_PATH=/fun-terminal/ npm run build
```

纯静态产物，无后端、无路由回退；文章与图片资源随构建产物发布。

## 质量门禁

```sh
npm run test:unit    # 单元测试（Vitest）
npm run type-check   # 类型检查
npm run lint         # 代码检查与修复
```

## 文档

- 架构设计：[docs/项目架构文档.md](docs/项目架构文档.md)
- 实施计划：[docs/PLAN.md](docs/PLAN.md)
- 文档索引：[docs/README.md](docs/README.md)
- 协作约定：[AGENTS.md](AGENTS.md)
