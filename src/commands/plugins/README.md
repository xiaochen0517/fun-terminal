# 命令插件（plugins）

插件通过核心契约接入，不修改终端核心：

- **安装阶段**：`createCommandRuntime` 按 `appPlugins` 数组顺序调用 `install(api)`；
- **能力入口**：`PluginApi` 提供 `registry`（注册命令）、`mounts`（挂载/卸载只读内容树）、
  `vfs`（只读查询）、`dataSource`（数据访问）；
- **失败隔离**：单个插件安装抛错只记录 `console.error` 并跳过，不影响其他插件与终端启动；
- **就绪门**：全部插件安装完成后 `runtime.ready` resolve，命令执行前会 `await` 它。

```ts
// src/commands/plugins/<name>/index.ts
import type { CommandPlugin } from '@/commands/CommandPlugin'
import { buildTree } from '@/fs/build'

export const examplePlugin: CommandPlugin = {
  id: 'example',
  commands: [exampleCommand],            // 可选：install 成功后才注册
  install(api) {                          // 允许返回 Promise（如等待异步数据）
    api.mounts.mount('/mnt/example', buildTree({ 'README.md': '# 示例' }))
  },
}
```

约定：

1. 插件不得 import Pinia Store、`window`、`fetch` 或运行时单例；数据一律经 `PluginApi` / `CommandContext` 获取。
2. 挂载目标限 `/mnt/**`（至少一级子目录）；子树必须是未挂载的全新目录节点，每次 `install` / 重挂都重新构造。
3. 挂载只改变 VFS 可见内容；所有输出由命令通过 `ctx.output` 写入。
4. 插件命令与核心命令遵循同一 `Command` 契约；命令名冲突时核心优先（保留先注册者）。

当前目录：

| 插件 | 状态 | 说明 |
| --- | --- | --- |
| `demo/` | 已实现（M6） | 挂载 `/mnt/demo`，提供 `mount` / `unmount` 示例命令 |
| `blog/` | 已实现（M8） | 挂载 `/mnt/blog`，提供 `blog list/read/tags/tag` 与 Markdown 渲染 |
| `image/` | M9 | 图片查看与 `/mnt/gallery` 挂载 |
