# 目录插件（filesystem）

提供文件系统相关命令（如 `ls`），基于虚拟文件系统（VFS）工作，
支持将站内静态内容目录挂载到 `/mnt` 供命令读取。

- 依赖：`src/fs/`（VFS 与挂载管理）
- 命令遵循 `Command` 契约，作为外置插件通过 `CommandPlugin.install()` 注册。

功能开发阶段实现。
