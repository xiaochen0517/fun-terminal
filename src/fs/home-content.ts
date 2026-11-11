/**
 * home 目录示例内容
 *
 * M5 阶段还没有任何插件内容，为了让 `ls` / `cat` 可独立演示与人工验收，
 * 在会话 home 下内置少量只读示例文件。示例内容属于核心欢迎内容，不经过
 * DataSource，也不占用 `/mnt` 的插件挂载空间。
 *
 * 每次调用 `createHomeContent()` 都通过 `buildTree` 新建节点，
 * 避免多个 `createFileSystem()` 实例共享节点、互相污染 `parent` 指针。
 */

import { buildTree } from '@/fs/build'
import type { VfsNode } from '@/fs/vfs'

export const HOME_README = `# fun-terminal

一个以终端为入口的个人站点。

## 从这里开始

  help              查看全部命令
  ls                列出当前目录
  cat README.md     查看本文件
  cd /mnt           查看挂载目录

## 说明

- 会话状态只在当前页面有效，刷新后回到 home。
- 内容目录会在后续里程碑挂载到 /mnt。
`

export const HOME_WELCOME = `这是 notes 目录下的示例文本文件。

你可以用下面的命令查看它：

  cat notes/welcome.txt
  cat -n notes/welcome.txt

文件中间有一个空行，用来观察 cat -n 是否给空行编号。
`

export const HOME_PROFILE = `# 隐藏文件示例：ls 默认不显示，ls -a 可以看到。
export EDITOR=vim
`

/** 构建 home 的只读示例子节点（每次返回全新实例） */
export function createHomeContent(): VfsNode[] {
  const tree = buildTree({
    'README.md': HOME_README,
    notes: { dir: { 'welcome.txt': HOME_WELCOME } },
    '.profile': { file: HOME_PROFILE },
  })
  const children = tree.children ?? []
  // buildTree 返回的子树根是临时节点；交给 createInitialTree 之前先解除 parent，
  // 保持「返回的是一组游离节点」的语义，避免调用方误用临时根。
  for (const child of children) child.parent = null
  return children
}
