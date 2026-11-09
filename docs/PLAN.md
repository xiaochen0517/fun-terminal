# fun-terminal 多里程碑实施计划

| 日期       | 审核结论                                        |
| -------- | ------------------------------------------- |
| 20261109 | 初稿创建：依据需求 20261106-01 与《项目架构文档》，拆分 M0–M10 里程碑 |

> 本文档是**实施路线图**，不是需求文档。每个里程碑正式开工前，仍须按 `AGENTS.md` 的「先文档、后审核、再执行」流程，单独提交该里程碑的需求文档（`docs/demands/`），经用户审核通过后方可编码。

## 0. 文档定位与使用方式

### 0.1 三份文档的关系

| 文档 | 回答的问题 | 变更频率 |
| --- | --- | --- |
| `docs/项目架构文档.md` | 系统最终长什么样（目标态） | 低，契约变更时回写 |
| `docs/PLAN.md`（本文） | 如何分步走到目标态（路径与顺序） | 中，里程碑调整时更新 |
| `docs/demands/YYYYMMDD-NN-*.md` | 某个里程碑具体做什么（开发合同） | 每个里程碑一份 |

### 0.2 里程碑拆解原则

1. **单一可演示目标**：每个里程碑结束时，都要能用一句话说清「演示什么」，且用户可人工验收。
2. **契约先行**：先落接口/类型，再落实现；每个里程碑只触碰必要的契约字段。
3. **可独立验收、可回滚**：里程碑之间尽量不共享未提交的半成品；单个里程碑失败不阻塞后续可并行的分支。
4. **依赖单向**：只允许后序里程碑依赖前序里程碑已验收的产物，禁止反向补丁式依赖。
5. **按需引入依赖**：`markdown-it` 等第三方依赖在对应里程碑的需求文档中列明理由与体积影响，不提前安装。
6. **不扩大一期边界**：不做真实系统能力（真实文件系统、进程、网络）、不做访客可用的插件安装、不引入后端。

### 0.3 单个里程碑的标准工作流

```
读取本文对应章节 → 编写 docs/demands/YYYYMMDD-NN-<里程碑>.md
→ 用户审核（可能多轮修改） → 审核通过 → 编码实现
→ 单元测试 + 质量门禁 → 人工演示/GUI 验收（由人工负责）
→ 回写架构文档（如有契约变更）→ 更新 docs/README.md 索引与本文状态
```

### 0.4 规模标记说明

| 标记 | 含义 |
| --- | --- |
| S | 小：集中在单一模块，新增文件少，无新依赖 |
| M | 中：跨 2–3 个模块，含接口扩展或组件实现 |
| L | 大：跨层改动、引入新依赖或涉及全局交互 |

## 1. 现状基线（As-Is）

### 1.1 已完成

| 项 | 位置 | 状态 |
| --- | --- | --- |
| 架构设计与技术选型 | `docs/项目架构文档.md`、需求 `20261106-01` | 已完成并确认 |
| `src/` 目录骨架 | `src/terminal/`、`src/commands/`、`src/fs/`、`src/data/`、`src/stores/` | 已初始化（README 占位） |
| 核心契约（仅类型/接口） | `CommandContext.ts`、`OutputBuffer.ts`、`CommandRegistry.ts`、`CommandParser.ts`、`CommandPlugin.ts`、`DataSource.ts`、`vfs.ts`、`mount.ts` | 已占位，无实现 |
| 工程脚手架 | Vue 3 + Vite + TS + Pinia，`@` 别名指向 `src/` | 可用 |
| 单元测试设施 | Vitest + `@vue/test-utils` + jsdom | 可用，仅 1 条脚手架断言 |

### 1.2 尚未开始

- 终端界面：`src/App.vue` 仍是脚手架默认页面，`src/stores/counter.ts` 仍是模板示例。
- 命令执行链路：解析器、注册表、执行器均无实现。
- 数据与文件系统：VFS、挂载管理、`DataSource` 无实现，无任何命令实现。
- 文章内容与 Markdown 渲染：无文章数据，未引入 `markdown-it`。
- 测试：`src/__tests__/App.spec.ts` 断言的是模板文案，M1 起需改写。

### 1.3 基线结论

**M0（架构确认与目录初始化）已完成**。当前代码处于「契约已定、实现为零」的状态，M1 起按本文顺序推进；M1–M3 是契约的首次实战检验，允许在不改变设计目标的前提下微调接口字段（须记入第 5 节决策清单并回写架构文档）。

## 2. 里程碑总览

| ID | 里程碑 | 核心目标 | 前置 | 规模 |
| --- | --- | --- | --- | --- |
| M0 | 架构与骨架 | 架构确认 + 目录与契约占位 | — | — |
| M1 | 终端外壳 | 可输入、可回显、可清屏的终端界面与会话状态 | M0 | M |
| M2 | 命令内核 | 解析 → 注册 → 执行 的完整链路与插件装配 | M1 | M |
| M3 | VFS 与挂载 | 虚拟文件系统、路径解析、`/mnt` 挂载能力 | M2（纯逻辑可提前开发，随 M2 合入） | M |
| M4 | 内置命令集 | `echo`/`help`/`history`/`clear`/`pwd`/`cd` | M3 | S |
| M5 | 目录插件 | `ls`（含 `-a`/`-l`）与 VFS 联动 | M4 | M |
| M6 | 文本插件 | `cat` 读取文件，错误与二进制识别 | M5 | S |
| M7 | 数据层 | `StaticDataSource` + 示例文章 + 元数据清单 | M2（可与 M3–M6 并行） | S |
| M8 | 博客插件 | `blog list/read/tags`，Markdown 富文本渲染 | M6、M7 | M |
| M9 | 图片插件 | `img` 查看图片，画廊挂载 | M6、M7 | S |
| M10 | 打磨与上线 | 补全、快捷键、响应式、输出上限、部署与文档收尾 | M4、M5、M6、M7、M8、M9 | M |

### 2.1 依赖关系图

```
M0 架构与骨架（已完成）
 └─ M1 终端外壳
     └─ M2 命令内核
         ├─ M3 VFS 与挂载 ── M4 内置命令 ── M5 目录插件 ── M6 文本插件
         ├─ M7 数据层与静态文章
         │    └─ M8 博客插件（另需 M6 的文本能力）
         └─ M9 图片插件（另需 M6、M7 的挂载与内容清单）

M4 + M5 + M6 + M7 + M8 + M9 ── M10 打磨与上线
```

### 2.2 并行建议

| 并行组合 | 说明 |
| --- | --- |
| M1 与 M3（纯逻辑部分） | VFS 是纯 TypeScript 模块，不依赖 UI，可在终端外壳开发期同步实现与单测；与命令链路的集成在 M2 完成后进行 |
| M4 与 M7 | 内置命令与数据层无直接依赖，可前后脚并行 |
| M7 与 M5/M6 | 数据层只依赖 `DataSource` 骨架，不依赖 VFS 实现 |

> 串行时按 M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 → M10 执行即可，依赖均满足。

## 3. 里程碑详情

每个里程碑包含：目标、范围边界、交付物、关键技术点、验收标准、建议需求文档名。验收标准即后续需求文档第 5 节的基线，可在此基础上细化。

---

### M0 架构与骨架（已完成）

**目标**：确认整体架构、技术选型与目录结构，冻结核心契约。

**状态**：已由需求 `20261106-01` 完成并验收。

**交付物**：

- `docs/项目架构文档.md`、`docs/demands/20261106-01-模拟终端网站整体架构设计.md`
- `src/terminal/`、`src/commands/`、`src/fs/`、`src/data/` 目录与 README 占位
- 8 个契约文件（类型/接口，无实现）

**遗留问题**：契约未经实现验证，M1–M3 首次落地时可能微调（如第 5 节 D-01）。

---

### M1 终端外壳与交互骨架

**目标**：访客打开页面即进入一个可输入、可回显的暗色终端；会话状态（当前目录、命令历史、环境变量）由 Pinia 统一管理。

**前置**：M0

**范围**：

- 包含：终端容器与视觉主题、提示符、输出区、输入捕获、命令回显、历史上下键、清屏、自动滚动、最小站点配置。
- 不包含：命令解析与真实命令（M2 起）、VFS、Tab 补全、移动端深度适配、博客渲染。

**交付物**：

```
src/config/site.ts                        站点身份配置（用户名、主机名、home、欢迎语）
src/stores/terminal.ts                    终端会话 Store（cwd/history/env/output）
src/terminal/context/OutputBuffer.ts      补充 createOutputBuffer(store) 实现（或拆出 buffer.ts）
src/terminal/components/Terminal.vue      终端容器：布局、聚焦、快捷键挂载点
src/terminal/components/TerminalOutput.vue 输出区：chunk 渲染、自动滚动
src/terminal/components/TerminalInput.vue  输入区：隐藏输入框、自绘光标、历史导航
src/terminal/components/PromptBar.vue      oh-my-zsh 风格提示符（用户@主机 + 路径 + %）
src/terminal/theme.css                    CSS 变量与终端主题样式
src/App.vue                               改写为挂载 <Terminal />
src/__tests__/Terminal.spec.ts            组件测试（回显、历史、清屏）
src/__tests__/App.spec.ts                 改写为终端挂载断言
src/stores/counter.ts                     删除（D-12）
```

**关键技术点**：

- **输入方案**：使用视觉隐藏的 `<textarea>` 捕获输入，自绘光标；页面任意位置点击即聚焦（便于「像终端一样」使用）。
- **提示符**：`guest@fun-terminal ~ %`，按段着色（用户@主机绿色、路径蓝色、`%` 白色），预留 git 分支占位段；路径段由 `cwd` 派生，home 显示为 `~`。
- **输出模型**：`OutputChunk` 目前只有 `text`/`html`；M1 先按两型渲染，`html` 走 `v-html`，仅允许受控内容（博客 M8 起才真正使用）。
- **清屏**：M1 临时识别 `clear` 作为唯一演示命令，M4 由内置命令接管并移除硬编码。
- **状态重置**：会话不持久化（刷新即重置），符合「一次性浏览」定位（见 D-08）。

**验收标准**：

- [ ] 打开页面显示欢迎信息与提示符，风格为暗色 + 等宽字体（oh-my-zsh 基础样式）。
- [ ] 页面任意位置点击可聚焦输入，键入字符实时可见。
- [ ] 回车后命令回显到输出区，并给出「命令系统将在下一里程碑接入」的临时提示。
- [ ] ↑/↓ 可浏览已执行命令，可编辑后再次提交；空输入回车不产生输出。
- [ ] 输入 `clear` 清空输出区，`cwd` 与历史不受影响。
- [ ] 长文本自动换行，输出增长时自动滚动到底部。
- [ ] 刷新页面后会话状态重置，无报错。
- [ ] 组件测试覆盖回显、历史导航、清屏；`type-check`/`lint`/`build` 通过。

**建议需求文档名**：`YYYYMMDD-01-终端外壳与交互骨架.md`

---

### M2 命令内核（Parser + Registry + Executor + Plugin）

**目标**：把「用户输入」变成「可插拔命令的可靠执行」，完成插件化架构的最小闭环。

**前置**：M1

**范围**：

- 包含：命令解析、注册表、执行器、上下文构建、插件安装入口、未知命令与异常兜底。
- 不包含：具体业务命令（M4 起）、VFS 实现（M3）、Tab 补全（M10）。

**交付物**：

```
src/terminal/parser/CommandParser.ts       实现 createCommandParser()
src/terminal/parser/__tests__/*.spec.ts    引号/选项/空白/边界用例
src/terminal/registry/CommandRegistry.ts   实现 createCommandRegistry()
src/terminal/registry/__tests__/*.spec.ts  注册/查找/冲突用例
src/terminal/executor/CommandExecutor.ts   新增执行器（查找 → 构建上下文 → 执行 → 兜底）
src/terminal/executor/context.ts           新增上下文构建函数（命令与测试共用）
src/commands/index.ts                      新增运行时装配：registry + builtin + plugins
src/commands/builtin/index.ts              内置命令注册入口（M2 占位，M4 填充）
src/stores/terminal.ts                     接入执行器：回显、输出、异常提示
```

**关键技术点**：

- **解析规则**：空格分隔；单/双引号包裹保留内部空格；`-a` 短选项、`--name=value` 与 `--name value` 长选项、短选项合并 `-la` → `-l -a`；`--` 之后全部视为位置参数。
- **注册策略**：命令名唯一；重复注册输出 `console.warn` 并保留先注册者（内置优先），策略见 D-02。
- **上下文注入**：`cwd`、`env`、`dataSource`、`vfs`、`output`、`commands` 快照与 `setCwd` 由执行器统一构建；`vfs` 在 M2 通过装配参数注入（测试用桩），M3 起接入真实实现；命令不得直接访问 Store 或全局单例（见 D-01、第 6 节）。
- **错误兜底**：未知命令与未捕获异常均由执行器转成终端文本，不打断会话。

**验收标准**：

- [ ] `echo "hello world"` 解析为 `args: ['hello world']`；`ls -la /mnt` 解析出 `-l`、`-a` 两个开关。
- [ ] `--name=value`、`--` 终止选项解析，均有单测覆盖。
- [ ] 重复注册同名命令时告警且保留先注册命令。
- [ ] 未知命令输出 `xxx: 未找到命令，输入 help 查看可用命令` 一类提示，会话可继续输入。
- [ ] 命令 `execute` 抛出的异常被捕获并展示为错误输出，不出现未处理 Promise rejection。
- [ ] 解析器、注册表、执行器单测齐全；门禁通过。

**建议需求文档名**：`YYYYMMDD-01-命令解析与执行内核.md`

---

### M3 虚拟文件系统（VFS）与挂载

**目标**：提供统一的虚拟目录树与路径语义，为 `cd`/`ls`/`cat`/`img` 提供唯一的数据访问入口。

**前置**：M2（VFS 纯逻辑可提前开发，契约扩展随 M2 落地）。

**范围**：

- 包含：节点模型实现、POSIX 路径规范化与解析、目录/文件读取、挂载点管理、静态树构建工具。
- 不包含：真实浏览器文件系统访问、符号链接、写操作（`mkdir`/`rm` 等）、命令实现。

**交付物**：

```
src/fs/path.ts                            新增：normalize / resolve / join / isAbsolute 纯函数
src/fs/vfs.ts                             实现 createVfs()、createDirectoryNode()、createFileNode()
src/fs/mount.ts                           实现 createMountManager()
src/fs/build.ts                           新增：由普通对象描述构建子树（静态内容复用）
src/fs/__tests__/path.spec.ts
src/fs/__tests__/vfs.spec.ts
src/fs/__tests__/mount.spec.ts
src/terminal/context/CommandContext.ts    扩展 vfs 字段（D-01）
```

**关键技术点**：

- **路径语义**：VFS 内部统一 POSIX 绝对路径，禁用反斜杠；`.`、`..`、重复斜杠、结尾斜杠均需规范化；越界 `..` 停留在根。
- **只读**：一期 VFS 只读，命令层不提供写操作，避免引入权限模型。
- **挂载**：`MountManager.mount(target, source, node)` 将子树挂到目标路径（如 `/mnt/blog`）；卸载后恢复原节点；节点 `parent` 指针由实现负责修正。
- **初始树**：`/`、`/home/guest`、`/mnt` 存在；`/mnt` 初始为空目录，具体内容由 M7/M9 的内容清单生成。

**验收标准**：

- [ ] `/`、`/home/guest`、`/mnt` 可解析，根节点 `parent === null`，子节点 `parent` 正确。
- [ ] `resolve('/mnt/../home/./guest')` 得到 `/home/guest`；`resolve('/../../x')` 得到 `/x`。
- [ ] `readDir` 对不存在路径返回 `null`；`readFile` 对目录返回 `null`。
- [ ] 挂载 `/mnt/blog` 后能读取其子节点，`unmount` 后该路径恢复为空目录。
- [ ] 路径/树/挂载单测覆盖异常输入（空串、`/`、多重斜杠、尾斜杠）。
- [ ] 门禁通过。

**建议需求文档名**：`YYYYMMDD-01-虚拟文件系统与挂载.md`

---

### M4 内置命令集

**目标**：终端具备完整的自我描述与导航能力，`help` 能自动反映注册表中的真实命令。

**前置**：M3

**范围**：

- 包含：`echo`、`help`、`history`、`clear`、`pwd`、`cd`。
- 不包含：`cd -`（上一次目录）、变量展开 `$HOME`、`echo -n`、命令别名。

**交付物**：

```
src/commands/builtin/echo.ts
src/commands/builtin/help.ts
src/commands/builtin/history.ts
src/commands/builtin/clear.ts
src/commands/builtin/pwd.ts
src/commands/builtin/cd.ts
src/commands/builtin/index.ts              汇总导出 Command[]
src/commands/builtin/__tests__/*.spec.ts   每个命令至少 1 正常 + 1 异常用例
```

**关键技术点**：

- **help 数据来源**：从执行器注入的 `commands` 快照生成清单，`help <命令>` 展示 `usage` 与 `description`，禁止硬编码命令列表。
- **cd 语义**：无参数回到 `~`；支持绝对/相对路径、`~`、`.`、`..`；目标是文件时报「不是目录」；成功时静默。
- **错误文案**：统一 `命令名: 中文描述`，如 `cd: 目录不存在: /mnt/xxx`。
- **接管清屏**：`clear` 由本里程碑的内置命令接管，移除 M1 的临时硬编码入口。
- **history**：带行号输出；上限与 Store 保持一致（建议 1000 条，见 D-08）。

**验收标准**：

- [ ] `echo hello world` 原样输出空格分隔内容；带引号的参数保持整体。
- [ ] `pwd` 输出当前虚拟目录；`cd /mnt` 后提示符路径段与 `pwd` 同步变化，`cd ~` 回到 `/home/guest`。
- [ ] `cd /mnt/nope` 输出错误且 `cwd` 不变；`cd` 指向文件时提示不是目录。
- [ ] `history` 显示带序号的历史；`clear` 清空输出但保留历史。
- [ ] `help` 列出全部已注册命令；`help cd` 展示用法；未知命令名给出提示。
- [ ] 门禁通过。

**建议需求文档名**：`YYYYMMDD-01-内置命令集.md`

---

### M5 目录插件（ls）

**目标**：以插件形式提供 `ls`，证明插件化命令架构可用。

**前置**：M4

**范围**：

- 包含：`ls [选项] [路径...]`；`-a` 显示 `.`/`..` 与隐藏项；`-l` 长格式（类型+权限、大小、名称）；多路径；目录着色。
- 不包含：`-R` 递归、`--color` 开关、权限位真实计算（只读树，统一 `drwxr-xr-x` / `-rw-r--r--`）、排序选项。

**交付物**：

```
src/commands/plugins/filesystem/index.ts   CommandPlugin 导出
src/commands/plugins/filesystem/ls.ts
src/commands/plugins/filesystem/__tests__/ls.spec.ts
src/terminal/components/TerminalOutput.vue 补充目录/文件链接样式（如需要）
```

**关键技术点**：

- **输出格式**：默认多列自适应（`flex-wrap`）；`-l` 每行一条；目录名追加 `/` 或使用强调色，二者取其一并在需求文档定稿。
- **路径解析**：参数相对 `cwd` 解析后再交给 VFS；不存在路径按参数逐个报错，不影响其他参数。
- **插件注册**：通过 `createCommandRuntime()` 统一装配，`ls` 不进入 `builtin` 目录。

**验收标准**：

- [ ] `ls` 列出当前目录，`ls /mnt/blog` 列出指定目录，`ls a b` 支持多路径并分行标注。
- [ ] `ls -a` 显示 `.` 与 `..`（根目录不显示 `..`）；`ls -l` 输出类型、大小、名称。
- [ ] 目录与文件在视觉上可区分；名称按升序排列。
- [ ] 不存在路径输出 `ls: 无法访问 'xxx': 目录不存在`，其余参数继续输出。
- [ ] 文件作为参数时直接输出文件名（遵循 `ls` 惯例）。
- [ ] 单测覆盖 `-a`、`-l`、多路径、不存在路径；门禁通过。

**建议需求文档名**：`YYYYMMDD-01-目录插件ls.md`

---

### M6 文本插件（cat）

**目标**：在终端内读取并展示文本文件内容，为博客纯文本查看与 `cat` 用法打底。

**前置**：M5

**范围**：

- 包含：`cat [-n] <文件...>`；多文件顺序输出；行号；目录/不存在/非文本文件的错误提示。
- 不包含：分页（`less`/`more`）、语法高亮、写入操作。

**交付物**：

```
src/commands/plugins/text/index.ts
src/commands/plugins/text/cat.ts
src/commands/plugins/text/__tests__/cat.spec.ts
```

**关键技术点**：

- **归属**：`cat` 划入文本插件（而非目录插件），见 D-04；架构文档中「待定」的归属在 M6 定稿。
- **二进制识别**：以扩展名/mime（`meta.mime`）判断；图片文件提示改用 `img`，其他二进制提示「无法以文本方式显示」。
- **换行处理**：保留原文换行；文件末尾若无换行，输出后补一次换行，避免提示符粘连。
- **大文件保护**：单文件超过阈值（如 200KB）提示截断或拒绝，防止输出区卡死（阈值在需求文档定稿）。

**验收标准**：

- [ ] `cat /mnt/blog/hello.md` 原样输出 Markdown 原文，缩进与代码块保持不变。
- [ ] `cat -n` 输出行号，多文件连续编号或按文件重置（需求文档定稿）。
- [ ] 目录参数提示 `cat: xxx: 是一个目录`；不存在文件提示 `cat: xxx: 文件不存在`。
- [ ] 图片文件提示改用 `img` 查看。
- [ ] 门禁通过。

**建议需求文档名**：`YYYYMMDD-01-文本插件cat.md`

---

### M7 数据层与静态文章

**目标**：建立「命令只依赖 `DataSource` 接口」的数据访问基线，并准备示例文章内容。

**前置**：M2；可与 M3–M6 并行。

**范围**：

- 包含：`Article` 元数据清单、3 篇示例 Markdown 文章、`StaticDataSource` 实现、数据源单例、内容清单到 VFS 的投影函数。
- 不包含：Markdown 渲染（M8）、后端 API、文章搜索、分页。

**交付物**：

```
src/data/static/articles/*.md              3 篇中文示例（欢迎/关于/技术笔记）
src/data/static/articles/index.ts          元数据清单（id/title/date/tags/excerpt）
src/data/static/StaticDataSource.ts        fetchArticleList / fetchArticle
src/data/static/vfs.ts                     内容清单 → VfsNode 子树（/mnt/blog，预留 /mnt/gallery）
src/data/index.ts                          导出 dataSource 单例
src/data/__tests__/StaticDataSource.spec.ts
```

**关键技术点**：

- **元数据来源**：采用显式 `index.ts` 声明，而非 frontmatter 解析（D-05），保证零依赖、类型安全、构建期可校验。
- **正文加载**：`import.meta.glob('./articles/*.md', { query: '?raw', import: 'default', eager: true })`，构建期内联，无需运行时请求。
- **一致性校验**：单测遍历元数据清单，确认每个 `id` 都能取到正文且文件存在，缺漏在测试期暴露。
- **异步契约**：`StaticDataSource` 返回 `Promise`，模拟未来 API 的异步形态，替换 `ApiDataSource` 时命令层无感。
- **单一数据源**：`cat` 看到的文章原文与 `blog read --raw` 来自同一份数据；VFS 投影由同一清单生成，不复制内容。

**验收标准**：

- [ ] `fetchArticleList()` 按日期倒序返回摘要（不含正文）。
- [ ] `fetchArticle(id)` 返回完整正文；不存在返回 `null`。
- [ ] 元数据与文章文件一一对应，单测全部通过。
- [ ] 运行时装配使用 `dataSource` 单例，命令通过 `ctx.dataSource` 获取。
- [ ] `/mnt/blog` 下可看到 `hello.md` 等文件（可在 M8 装配时验证）。
- [ ] 门禁通过。

**建议需求文档名**：`YYYYMMDD-01-静态数据源与文章内容.md`

---

### M8 博客插件（Markdown 富文本）

**目标**：在终端内完成博客浏览闭环：列表 → 阅读（富文本）→ 纯文本查看 → 标签筛选。

**前置**：M6、M7

**范围**：

- 包含：`blog list`、`blog read <id>`、`blog read --raw <id>`、`blog tags`、`blog tag <tag>`；`markdown-it` 渲染与安全配置；Markdown 正文样式。
- 不包含：评论、搜索、分页、目录（TOC）交互、文章内图片点击放大、发布后台。

**交付物**：

```
package.json                                   新增 markdown-it 与 @types/markdown-it
src/markdown/render.ts                         渲染器单例（html:false / linkify / breaks）
src/markdown/__tests__/render.spec.ts
src/commands/plugins/blog/index.ts             CommandPlugin 导出
src/commands/plugins/blog/list.ts
src/commands/plugins/blog/read.ts
src/commands/plugins/blog/tags.ts
src/commands/plugins/blog/tag.ts
src/commands/plugins/blog/__tests__/*.spec.ts
src/terminal/theme.css                         .md 正文样式（标题/代码/引用/表格/链接）
```

**关键技术点**：

- **渲染安全**：`markdown-it({ html: false, linkify: true, breaks: true })`，文章中的原始 HTML 不生效；链接统一 `target="_blank" rel="noopener noreferrer"`；输出前所有动态文本经 `escapeHtml`（D-06）。
- **两种查看方式**：默认富文本（`output.writeHtml`）；`--raw` 走纯文本（复用 `cat` 的读取逻辑或直接输出 `article.content`）。
- **列表格式**：`id`、日期、标题对齐展示；`blog tag <tag>` 复用列表格式并支持无结果提示。
- **错误文案**：未知 `id` 提示 `blog: 文章不存在: xxx，输入 blog list 查看全部文章`。
- **VFS 联动**：M7 的投影函数在运行时装配中挂载到 `/mnt/blog`，`/mnt/blog/<id>.md` 与博客数据同源，`cat` 可直接读原文。

**验收标准**：

- [ ] `blog list` 按日期倒序展示全部文章（id/日期/标题）。
- [ ] `blog read <id>` 渲染标题、段落、列表、代码块、链接；代码块等宽可横向滚动，链接新窗口打开。
- [ ] `blog read --raw <id>` 输出纯文本原文，提示符不粘连。
- [ ] `blog tags` 展示标签及文章数；`blog tag <tag>` 过滤列表，无结果时给出提示。
- [ ] `cat /mnt/blog/<id>.md` 可读到同一篇原文。
- [ ] 单测覆盖：原始 HTML 被转义、未知 id、`--raw`、标签过滤。
- [ ] 门禁通过。

**建议需求文档名**：`YYYYMMDD-01-博客插件与Markdown渲染.md`

---

### M9 图片插件（img）

**目标**：在终端输出区展示站内图片，完成「目录 → 文本 → 图片」三类内容浏览的最后一块拼图。

**前置**：M6、M7

**范围**：

- 包含：`img <路径>`；png/jpg/jpeg/gif/webp/svg；示例画廊挂载 `/mnt/gallery`；图片自适应尺寸与说明文字。
- 不包含：上传、缩放交互、幻灯片、EXIF、视频/音频。

**交付物**：

```
src/commands/plugins/image/index.ts
src/commands/plugins/image/img.ts
src/commands/plugins/image/__tests__/img.spec.ts
src/data/static/gallery/index.ts              图片清单（url/mime/alt/说明）
src/data/static/gallery/*                     2 张示例图片
```

**关键技术点**：

- **命令名**：`img`（D-07），语义明确、短、不与常见 Linux 命令冲突。
- **渲染方式**：输出 `html` chunk，`<figure><img src alt loading="lazy"><figcaption>`；`max-width: 100%`，高度自适应，避免撑破终端布局。
- **资源来源**：示例图片用 `import.meta.glob('./gallery/*', { eager: true, query: '?url', import: 'default' })` 获取构建后 URL；VFS 节点 `meta.src` 保存该 URL。
- **格式校验**：按扩展名 + `meta.mime` 双重判断；非图片文件提示 `img: 不支持的图片格式: xxx`。

**验收标准**：

- [ ] `img /mnt/gallery/01.png` 在输出区渲染图片，带说明文字，窄屏下不溢出。
- [ ] `ls /mnt/gallery` 能看到图片文件，`cat` 图片时提示改用 `img`。
- [ ] 不存在的路径提示文件不存在；文本文件提示格式不支持。
- [ ] 图片节点带 `alt`，在 jsdom 测试中可断言 `src`/`alt`。
- [ ] 门禁通过。

**建议需求文档名**：`YYYYMMDD-01-图片查看插件.md`

---

### M10 打磨与上线

**目标**：把「能用的终端」打磨成「可对外访问的个人站点」，并完成文档收尾。

**前置**：M4、M5、M6、M7、M8、M9

**范围**：

- 包含：站点配置集中化、启动 banner/motd、Tab 命令补全、Ctrl+L/Ctrl+C 快捷键、输出条数上限、响应式与无障碍、静态部署配置、README 与架构文档回写。
- 不包含：路径/参数补全（进 Backlog）、E2E 自动化、主题切换、多语言、后端。

**交付物**：

```
src/config/site.ts                         站点身份与部署配置集中管理（M1 建立，M10 扩展）
src/terminal/completion.ts                 命令名补全（唯一候选补全，多候选列出）
src/terminal/components/Terminal.vue       快捷键（Ctrl+L 清屏、Ctrl+C 取消输入）、aria-live
src/stores/terminal.ts                     输出上限与截断提示
src/terminal/theme.css                     响应式断点、移动端字号/间距
vite.config.ts                             base 与构建配置（按部署目标）
README.md                                  替换模板说明为项目说明
docs/项目架构文档.md                        回写 M1–M10 的契约变更
docs/README.md                             索引补全
```

**关键技术点**：

- **配置集中**：用户名、主机名、home、欢迎语、版本号统一在 `src/config/site.ts`，提示符、banner、`help` 头部共用，禁止散落硬编码。
- **补全策略**：Tab 仅补全命令名；唯一匹配直接补全，多个匹配列出候选（最多 N 条）；路径补全列入 Backlog。
- **输出上限**：超过上限（建议 1000 条 chunk）时丢弃最旧内容并插入「输出已截断」系统提示，防止长时间使用后卡顿（D-08）。
- **响应式**：窄屏下减小字号与内边距、提示符允许换行、输入区吸附底部；`aria-live="polite"` 声明输出区，隐藏输入框带 `aria-label`。
- **部署**：纯静态产物，按目标平台配置 `base`；不引入路由，无需 404 回退（D-11）。

**验收标准**：

- [ ] `src/config/site.ts` 修改用户名/主机名后，提示符、banner、`help` 头部同步变化。
- [ ] 启动显示 banner/motd；Tab 补全命令名（唯一/多候选两种行为正确）。
- [ ] Ctrl+L 清屏、Ctrl+C 清空当前输入，均不影响历史。
- [ ] 输出超过上限时出现截断提示，页面滚动与输入仍流畅。
- [ ] 窄屏（375px 宽）下可正常输入、阅读与滚动；输出区具备无障碍标签。
- [ ] `npm run build` 产物可直接部署到目标平台，页面可正常加载（含子路径场景，如适用）。
- [ ] README 为项目说明；架构文档已回写实现期契约变更；`docs/README.md` 索引完整。
- [ ] 按第 7 节完成全量手工回归。

**建议需求文档名**：`YYYYMMDD-01-终端打磨与站点上线.md`

## 4. 架构覆盖矩阵

### 4.1 架构章节覆盖

| 架构文档章节 | 覆盖里程碑 | 说明 |
| --- | --- | --- |
| 第 3 节 目录结构 | M1–M9 | 按既定目录落位，M2 新增 `executor/`、M8 新增 `markdown/` |
| 第 4 节 总体架构分层 | M1、M2、M7 | 展示层、命令执行层、数据层 |
| 第 5 节 命令分类 | M4、M5、M6、M8、M9 | 内置命令与各插件命令 |
| 第 6 节 插件化命令架构 | M2、M4–M9 | 契约与装配在 M2，命令实现分布在后序里程碑 |
| 第 7 节 VFS 与挂载 | M3 | 节点、路径、挂载点 |
| 第 8 节 博客集成方案 | M7、M8 | 数据与内容准备、渲染与浏览命令 |
| 第 9 节 状态管理与数据流 | M1、M2、M4 | 会话 Store、执行链路接入、`cwd` 变更 |
| 第 10 节 视觉与语言约定 | M1、M8、M10 | 主题、中文文案、Markdown 样式 |
| 第 11 节 构建与部署 | M10 | 构建、静态托管 |
| 第 12 节 约定与规范 | 全程 | 文档流程、需求/缺陷归档与索引 |

> 覆盖检查结论：架构文档中的每个功能点都能追溯到至少一个里程碑；无「规划了但无里程碑承载」的模块。

### 4.2 命令落地对照

| 命令 | 类别 | 里程碑 | 说明 |
| --- | --- | --- | --- |
| `echo` | 内置 | M4 | 文本输出 |
| `history` | 内置 | M4 | 历史列表（带序号） |
| `help` | 内置 | M4 | 自动读取注册表生成清单 |
| `clear` | 内置 | M4 | 清屏，保留历史 |
| `pwd` | 内置 | M4 | 输出 `cwd` |
| `cd` | 内置 | M4 | 基于 VFS 切换目录 |
| `ls` | 外置（filesystem） | M5 | `-a`/`-l`，多路径 |
| `cat` | 外置（text） | M6 | 纯文本读取，D-04 定稿归属 |
| `blog` | 外置（blog） | M8 | `list`/`read`/`read --raw`/`tags`/`tag` |
| `img` | 外置（image） | M9 | 架构中「图片查看命令」定名 `img`（D-07） |

## 5. 待确认决策清单

以下问题会影响多个里程碑的契约或交互，建议在提交首个里程碑需求前先拍板；未拍板项按「建议方案」执行，并在对应需求文档中再次确认。

| 编号 | 待确认问题 | 可选项 | 建议方案 | 影响里程碑 |
| --- | --- | --- | --- | --- |
| D-01 | `CommandContext` 如何获得 VFS、`cd` 写入与命令清单 | ① 扩展 Context（`vfs`/`setCwd`/`commands`）；② 命令直接 import 全局 Store/单例 | ①：保持命令无全局依赖，便于单测与替换 | M3、M4 |
| D-02 | 命令名冲突策略 | ① 后注册覆盖；② 告警并保留先注册；③ 抛错 | ②：内置优先，插件冲突可见但不破坏启动 | M2 |
| D-03 | 输出块类型是否够用 | ① 仅 `text`/`html`；② 增加 `error`（错误色）与 `system`（提示色） | ②：错误与系统提示需要独立样式；`html` 仅承载受控富文本 | M1、M2 |
| D-04 | `cat` 归属插件 | ① 文本插件；② 目录插件 | ①：与文本处理职责一致，目录插件只负责列举 | M6 |
| D-05 | 文章元数据来源 | ① frontmatter 解析；② 显式 `index.ts`；③ 文件名约定 | ②：零依赖、类型安全、构建期可校验 | M7 |
| D-06 | Markdown 安全与渲染配置 | ① `html: false` + linkify；② 允许原始 HTML + DOMPurify | ①：内容由站主编写，无需 HTML 直通，减少依赖与 XSS 面 | M8 |
| D-07 | 图片命令名 | `img` / `view` / `open` / `pic` | `img`：短、语义明确、无命名冲突 | M9 |
| D-08 | 历史与输出持久化 | ① 仅内存；② 历史持久化到 localStorage | ①：隐私友好、刷新即净；输出设上限（建议 1000 chunk） | M1、M10 |
| D-09 | 输入捕获方案 | ① 隐藏 `<textarea>` + 自绘光标；② `contenteditable`；③ 可见输入框 | ①：粘贴/输入法/移动端兼容性最好，样式可控 | M1 |
| D-10 | Tab 补全范围 | ① 仅命令名；② 命令名 + 路径/参数 | ①：一期先保证命令发现性，路径补全进 Backlog | M10 |
| D-11 | 部署目标 | ① 根路径静态托管；② GitHub Pages 子路径；③ 暂不部署 | ①/③：先保证 `build` 可用，`base` 待目标确定后配置 | M10 |
| D-12 | 脚手架示例文件处理 | ① 删除 `counter.ts` 并改写 `App.spec.ts`；② 保留 | ①：避免示例代码与真实架构混淆 | M1 |
| D-13 | 是否引入 E2E 测试 | ① 一期不做，手工回归；② Playwright | ①：终端交互以组件测试 + 手工回归覆盖，控制依赖与工期 | M10 |

> 20261109：D-03 已随 M1 需求 `20261109-01` 审核确认，输出块最终为 `text`/`html`/`system`/`error`/`command` 五型。

## 6. 跨里程碑技术约定

以下约定建议在 M1 需求文档中一并冻结，后续里程碑沿用：

1. **路径**：VFS 内部一律 POSIX 绝对路径，禁用 `\`；命令接收的相对路径先基于 `cwd` 解析，再交给 VFS。
2. **命令职责**：命令只通过 `CommandContext` 取数据、写输出；不得直接 import Pinia Store、`window`、`fetch` 或静态文件。
3. **错误处理**：可预期的失败（文件不存在、参数非法）由命令自行输出错误并正常返回；未捕获异常由执行器兜底为「系统错误」，不中断会话。
4. **错误文案**：统一 `命令名: 中文描述`；命令名与选项保持英文，面向访客的说明使用中文。
5. **输出转义**：凡拼入 `html` chunk 的动态文本必须经 `escapeHtml`；Markdown 渲染遵循 D-06。
6. **插件形态**：每个插件导出 `CommandPlugin`（`id` + `commands`），由 `src/commands/index.ts` 统一装配；不修改终端核心即可新增插件。
7. **命名**：命令名全小写单词（`ls`、`cat`、`img`），子命令用空格分隔（`blog read`）；文件名用 kebab-case。
8. **测试**：纯逻辑模块（parser/registry/vfs/path/mount/datasource/markdown）独立单测；命令用伪造 Context 测试；组件用 `@vue/test-utils` + jsdom。
9. **依赖**：新增运行时依赖必须在该里程碑需求文档中说明必要性、体积与替代方案。
10. **文档同步**：契约字段一旦变化，同步更新架构文档第 6.2 节、本文第 5 节状态，并在里程碑验收中检查。

## 7. 质量门禁与完成定义

### 7.1 每个里程碑的完成定义（DoD）

一个里程碑只有同时满足以下条件才算完成：

1. 对应需求文档已审核通过，并登记到 `docs/README.md`。
2. 验收标准逐条可演示、可勾选。
3. 新增/修改逻辑有单元测试，`npm run test:unit` 全部通过。
4. `npm run type-check`、`npm run lint`、`npm run build` 通过。
5. 浏览器控制台无新增报错，无未处理 Promise rejection。
6. 涉及契约或架构变更的，架构文档与本文第 5 节已回写。
7. 本文第 9 节进度表状态已更新。
8. 涉及 GUI 前端页面时，已由人工按需求文档演示脚本验收通过；AI 未以自动化结果替代人工结论。

### 7.2 测试分层

| 层级 | 对象 | 工具 | 覆盖要求 |
| --- | --- | --- | --- |
| 单元测试 | `path`/`vfs`/`mount`/parser/registry/markdown/DataSource | Vitest | 正常路径 + 边界/异常；关键函数分支覆盖 |
| 命令测试 | 内置命令、各插件命令 | Vitest + 伪造 `CommandContext` | 每个命令至少 1 正常 + 1 异常；输出文案可断言 |
| 组件测试 | `Terminal`/`TerminalInput`/`TerminalOutput` | `@vue/test-utils` + jsdom | 输入回显、历史、清屏、chunk 渲染 |
| 手工回归 | 全链路 | 浏览器 | 每里程碑按演示脚本执行；M10 做全量回归 |

### 7.3 手工回归清单（M10）

- [ ] 冷启动：banner、提示符、聚焦均正常。
- [ ] 基础命令：`help`、`echo`、`history`、`clear`、`pwd`、`cd`。
- [ ] 文件浏览：`ls`、`ls -a`、`ls -l`、`cat`（含错误路径）。
- [ ] 博客：`blog list`、`blog read`、`blog read --raw`、`blog tags`、`blog tag`。
- [ ] 图片：`img`（正常图片 + 非图片 + 不存在）。
- [ ] 交互：历史上下键、Tab 补全、Ctrl+L、Ctrl+C、长输出滚动。
- [ ] 视口：桌面与 375px 窄屏；刷新重置；控制台无报错。

## 8. 风险与对策

| 风险 | 影响 | 对策 | 关联里程碑 |
| --- | --- | --- | --- |
| 契约未经实现验证，落地时频繁改接口 | 返工、里程碑延期 | M1–M3 集中暴露问题，接口变更走第 5 节决策并即时回写文档 | M1–M3 |
| `v-html` 引入 XSS 面 | 安全风险 | Markdown `html:false`；动态文本统一 `escapeHtml`；`html` chunk 仅由受控命令产出 | M1、M8 |
| 输出无限增长导致页面卡顿 | 体验下降 | 输出 chunk 上限 + 截断提示；长文件读取设阈值 | M6、M10 |
| 移动端软键盘/滚动/输入法兼容问题 | 手机端不可用 | 隐藏 `<textarea>` 方案；M10 专项适配与真机验证 | M1、M10 |
| VFS 语义与真实路径混淆 | 命令行为不一致 | 路径处理收敛到 `src/fs/path.ts`，统一单测覆盖 `.`/`..`/尾斜杠 | M3 |
| 文章数据与 VFS 内容重复维护 | 数据不一致 | 以 `DataSource` 为单一来源，VFS 由同一清单投影生成 | M7、M8 |
| `markdown-it` 增加包体 | 首屏变慢 | 仅在 M8 引入；必要时按路由/异步加载，评估 gzip 体积 | M8 |
| 里程碑间依赖阻塞 | 进度串行化 | 按第 2.2 节并行组合拆分任务；每个里程碑独立验收 | 全程 |

## 9. 需求提交模板与进度追踪

### 9.1 里程碑需求文档模板

按 `AGENTS.md` 规范，文件名 `YYYYMMDD-NN-<里程碑名>.md`，正文建议包含：

```markdown
# <里程碑名>：<功能标题>

| 日期 | 审核结论 |
|------|----------|
| YYYYMMDD | 初稿创建 |

## 1. 需求背景
（引用本文 Mx 与《项目架构文档》对应章节，说明为什么现在做）

## 2. 需求描述
（本里程碑要做什么；明确「不在本次范围」的条目）

## 3. 方案设计
（接口/数据结构/新增文件/交互细节；如有契约变更，列出变更前后对比）

## 4. 影响范围
（涉及文件、依赖、对既有命令/组件的影响、文档回写项）

## 5. 验收标准
（以本文对应里程碑的验收项为基线，逐条可勾选）

## 6. 待确认问题
（引用本文 D-xx，或本里程碑新增的待定项）
```

> 涉及 GUI 的需求，第 5 节须区分「人工验收项」与「自动化门禁」，并在第 2 节提供可复现的演示脚本；人工验收通过前状态只能为「待验收」，详见 `AGENTS.md` 第三节。

### 9.2 进度追踪

| 里程碑 | 状态 | 需求文档 | 验收日期 |
| --- | --- | --- | --- |
| M0 架构与骨架 | 已完成 | `20261106-01-模拟终端网站整体架构设计.md` | 20261106 |
| M1 终端外壳 | 已完成 | `20261109-01-终端外壳与交互骨架.md` | 20261109 |
| M2 命令内核 | 待启动 | — | — |
| M3 VFS 与挂载 | 待启动 | — | — |
| M4 内置命令集 | 待启动 | — | — |
| M5 目录插件 | 待启动 | — | — |
| M6 文本插件 | 待启动 | — | — |
| M7 数据层与静态文章 | 待启动 | — | — |
| M8 博客插件 | 待启动 | — | — |
| M9 图片插件 | 待启动 | — | — |
| M10 打磨与上线 | 待启动 | — | — |

## 10. 暂不纳入路线图（Backlog）

以下能力明确属于一期之后或需单独立项，本文不为其分配里程碑：

| 事项 | 说明 |
| --- | --- |
| 命令包远程安装/卸载 | 架构预留扩展点，一期不实现访客可用安装能力 |
| `ApiDataSource` + 后端服务 | 评论、统计、搜索、鉴权等动态能力的前置 |
| 路径与参数补全 | M10 仅做命令名补全，路径补全需结合 VFS 与实际使用反馈 |
| E2E 自动化测试 | 一期以组件测试 + 手工回归覆盖，待交互稳定后评估 Playwright |
| 真实 ANSI 解析 / xterm.js | 当前自研渲染满足需求，出现复杂着色需求时再评估 |
| 多语言、主题切换 | 架构已明确不做中英切换；主题切换需产品需求输入 |
| 文件写入类命令（`mkdir`/`rm`/`touch`） | VFS 一期只读，写操作需权限与持久化设计 |

## 11. 变更记录

| 日期 | 变更内容 |
| --- | --- |
| 20261109 | 初稿：拆分 M0–M10 里程碑，补充决策清单、质量门禁、风险与需求模板 |
| 20261109 | M1 终端外壳落地：完成终端组件/Store/五型 OutputChunk 与测试，D-03 确认；UI 待人工验收 |
| 20261109 | M1 人工页面验收通过，状态更新为已完成；补充 GUI 前端人工审核规范（AGENTS 第三节、需求文档第 7 节） |
