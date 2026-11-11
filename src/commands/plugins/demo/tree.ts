/**
 * 示例插件（demo）内容树
 *
 * 通过 `buildTree` 把普通对象描述转成只读子树，供 `install(api)` 挂到
 * `/mnt/demo`。挂载会改写根节点的 name / parent，因此每次挂载都必须调用
 * `createDemoTree()` 生成全新节点，不能复用模块级实例。
 */

import { buildTree } from '@/fs/build'
import type { VfsNode } from '@/fs/vfs'

/** 示例插件的挂载目标（M8 的 /mnt/blog、M9 的 /mnt/gallery 各用各的目录） */
export const DEMO_MOUNT_TARGET = '/mnt/demo'

export const DEMO_README = `# 示例挂载目录

这个目录由示例插件（demo）在安装阶段挂载到 /mnt/demo，
用来验证「插件通过 PluginApi 挂载内容树」这条路径。

- 挂载与命令都来自插件，核心只提供 VFS、MountApi 与命令内核。
- 执行 unmount /mnt/demo 后本目录消失，重新 mount /mnt/demo 即可恢复。
`

export const DEMO_NOTES = `示例笔记：核心与插件的边界

核心负责：路径、VFS、挂载白名单、命令内核与就绪门。
插件负责：把内容挂到 /mnt，并提供该内容专属的命令。

挂载只改变 VFS 可见内容，不直接产生输出；
所有输出仍由命令通过 ctx.output 写入。
`

export const DEMO_PLUGIN_GUIDE = `# 插件接入说明

1. 导出 CommandPlugin：id + commands + install(api)。
2. 在 install(api) 中用 api.mounts.mount 挂载只读子树。
3. 用 commands 字段或 api.registry.register 注册命令。
4. 命令内通过 ctx.vfs 读取、ctx.mounts 管理挂载、ctx.output 输出。
`

/** 每次调用返回全新节点，避免多个挂载 / 多次挂载共享 parent 指针 */
export function createDemoTree(): VfsNode {
  return buildTree({
    'README.md': DEMO_README,
    'notes.txt': DEMO_NOTES,
    docs: { dir: { 'plugin.md': DEMO_PLUGIN_GUIDE } },
  })
}
