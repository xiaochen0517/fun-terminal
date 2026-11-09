# 终端组件（components）

M1 已落地的终端 UI 组件：

- `Terminal.vue`：终端根组件，负责布局、聚焦、提交与自动滚动。
- `TerminalOutput.vue`：输出块渲染（text/html/system/error/command）。
- `TerminalInput.vue`：透明 textarea + 镜像文本 + 自绘光标 + 历史导航。
- `PromptBar.vue`：oh-my-zsh 风格提示符，按 home 缩写路径。

主题与全局样式见 `../theme.css`。
