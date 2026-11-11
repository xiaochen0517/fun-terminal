# 内置命令（builtin）

终端基础能力，随核心启动即加载。已实现命令：

| 命令 | 说明 |
| --- | --- |
| `echo` | 输出文本 |
| `history` | 查看命令历史 |
| `help` | 查看帮助信息（中文） |
| `clear` | 清屏 |
| `pwd` | 显示当前虚拟目录 |
| `cd` | 切换虚拟目录 |
| `ls` | 列出目录内容（`-a` / `-l` / 多路径） |
| `cat` | 查看文本文件内容（`-n` / 多文件） |

命令实现遵循 `Command` 契约（见 `src/terminal/context/CommandContext.ts`），
随终端核心注册到 `CommandRegistry`；路径与选项处理复用 `path-argument.ts`。
