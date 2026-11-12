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
| M3 | VFS 与挂载（核心） | 核心 VFS：节点/路径/挂载管理，`ctx.vfs` 与 `ctx.mounts` | M2（纯逻辑可提前开发，随 M2 合入） | M |
| M4 | 核心导航命令 | `history`/`pwd`/`cd`（`echo`/`help`/`clear` 已在 M2） | M3 | S |
| M5 | 核心文件浏览命令 | `ls`（`-a`/`-l`/多路径）与 `cat`（`-n`/二进制识别） | M4 | M |
| M6 | 内容挂载插件框架 | 插件通过核心 `PluginApi`/`MountApi` 挂载内容树、注册命令（含 `mount`/`unmount` 类命令能力） | M3、M4 | M |
| M7 | 数据层 | `StaticDataSource` + 示例文章 + 元数据清单 | M2（可与 M3–M5 并行） | S |
| M8 | 博客插件 | 挂载 `/mnt/blog` + `blog list/read/tags` + Markdown 富文本渲染 | M6、M7 | M |
| M9 | 图片插件 | 挂载 `/mnt/gallery` + `img` 查看图片 | M6、M7 | S |
| M10 | 打磨与上线 | 补全、快捷键、响应式、输出上限、部署与文档收尾 | M4、M5、M6、M7、M8、M9 | M |

### 2.1 依赖关系图

```
M0 架构与骨架（已完成）
 └─ M1 终端外壳
     └─ M2 命令内核
         ├─ M3 VFS 与挂载（核心）── M4 核心导航命令 ── M5 核心文件浏览命令
         │        └────────────────────────────── M6 内容挂载插件框架
         ├─ M7 数据层与静态文章
         │    └─ M8 博客插件（另需 M6 的挂载与命令能力）
         └─ M9 图片插件（另需 M6、M7）

M4 + M5 + M6 + M7 + M8 + M9 ── M10 打磨与上线
```

### 2.2 并行建议

| 并行组合 | 说明 |
| --- | --- |
| M1 与 M3（纯逻辑部分） | VFS 是纯 TypeScript 模块，不依赖 UI，可在终端外壳开发期同步实现与单测；与命令链路的集成在 M2 完成后进行 |
| M4 与 M7 | 核心导航命令与数据层无直接依赖，可前后脚并行 |
| M6 与 M5 | 挂载插件框架只依赖 M3 的 `MountApi` 与 M2 的注册表，可与核心文件浏览命令并行 |
| M7 与 M3/M5 | 数据层只依赖 `DataSource` 骨架，不依赖 VFS 实现 |

> 串行时按 M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 → M10 执行即可，依赖均满足。

> **20261110 已确认**：VFS、路径、挂载与 `pwd`/`cd`/`ls`/`cat` 等常用命令归入**核心**；插件通过 `PluginApi`（registry/mounts/vfs/dataSource）挂载内容树并注册命令，可在命令中通过 `ctx.mounts` 提供 `mount`/`unmount` 等挂载管理能力；M4/M5 为核心命令，M6 改为「内容挂载插件框架」，`blog`/`img` 留在 M8/M9 插件中。

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

**状态**：已完成（20261110 人工页面验收通过）。

**前置**：M1

**范围**：

- 包含：命令解析、注册表、执行器、上下文构建、插件安装入口、未知命令与异常兜底；首批核心命令 `echo`/`help`/`clear`（`clear` 由命令接管，删除 M1 字符串特例）。
- 不包含：其余核心命令（M4/M5）、内容与插件命令（M6 起）、VFS 实现（M3）、Tab 补全（M10）。

**交付物**：

```
src/terminal/parser/CommandParser.ts       实现 createCommandParser()
src/terminal/parser/__tests__/*.spec.ts    引号/选项/空白/边界用例
src/terminal/registry/CommandRegistry.ts   实现 createCommandRegistry()
src/terminal/registry/__tests__/*.spec.ts  注册/查找/冲突用例
src/terminal/executor/CommandExecutor.ts   新增执行器（查找 → 构建上下文 → 执行 → 兜底）
src/terminal/executor/context.ts           新增上下文构建函数（命令与测试共用）
src/commands/index.ts                      新增运行时装配：registry + builtin + plugins
src/commands/builtin/index.ts              内置命令注册入口（导出 builtinPlugin）
src/commands/builtin/echo.ts               首批核心命令 echo
src/commands/builtin/help.ts               首批核心命令 help（从 ctx.commands 生成清单）
src/commands/builtin/clear.ts              首批核心命令 clear（接管 M1 字符串特例）
src/data/index.ts                           dataSource 出口（M2 占位，M7 替换为 StaticDataSource）
src/stores/terminal.ts                     接入执行器：回显、输出、异常提示
```

**关键技术点**：

- **解析规则**：空格分隔；单/双引号包裹保留内部空格；`-a` 短选项、`--name=value` 与 `--name value` 长选项、短选项合并 `-la` → `-l -a`；`--` 之后全部视为位置参数。
- **注册策略**：命令名唯一；重复注册输出 `console.warn` 并保留先注册者（内置优先），策略见 D-02。
- **上下文注入**：`cwd`、`env`、`dataSource`、`output`、`commands` 快照与 `setCwd` 由执行器统一构建；`vfs`/`mounts` 自 M3 加入上下文（M2 不引入）；命令不得直接访问 Store 或全局单例（见 D-01、第 6 节）。
- **错误兜底**：未知命令与未捕获异常均由执行器转成终端文本，不打断会话。
- **clear 命令化**：M2 起 `clear` 由内置命令调用 `ctx.output.clear()` 完成清屏，Store 不再保留字符串特例；`clear` 出现在 `help` 清单中。

**验收标准**：

- [ ] `echo "hello world"` 解析为 `args: ['hello world']`；`ls -la /mnt` 解析出 `-l`、`-a` 两个开关。
- [ ] `--name=value`、`--` 终止选项解析，均有单测覆盖。
- [ ] 重复注册同名命令时告警且保留先注册命令。
- [ ] 未知命令输出 `xxx: 未找到命令，输入 help 查看可用命令` 一类提示，会话可继续输入。
- [ ] 命令 `execute` 抛出的异常被捕获并展示为错误输出，不出现未处理 Promise rejection。
- [ ] `echo` 输出参数文本；`help` 从注册表列出 `echo`/`help`/`clear`；`clear` 经命令清屏且保留历史，`clear foo` 报错不清屏。
- [ ] 解析器、注册表、执行器、上下文、首批命令单测齐全；门禁通过。

**建议需求文档名**：`YYYYMMDD-01-命令解析与执行内核.md`

---

### M3 虚拟文件系统（VFS）与挂载

**目标**：提供统一的虚拟目录树与路径语义，为 `cd`/`ls`/`cat`/`img` 提供唯一的数据访问入口。

**状态**：已完成（20261110 人工回归确认通过；文档 `20261110-02-虚拟文件系统与挂载.md`）。

**前置**：M2（VFS 纯逻辑可提前开发，契约扩展随 M2 落地）。

**范围**：

- 包含：节点模型实现、POSIX 路径规范化与解析、目录/文件读取、挂载点管理、静态树构建工具。
- 不包含：真实浏览器文件系统访问、符号链接、写操作（`mkdir`/`rm` 等）、命令实现。

**交付物**：

```
src/fs/path.ts                            新增：normalize / resolve / join / dirname / basename / isAbsolute 纯函数
src/fs/vfs.ts                             实现 createVfs()、createDirectoryNode()、createFileNode()、MutableVfs（核心内部 attach/detach）
src/fs/mount.ts                           实现 createMountManager()（MountApi：MountResult / 禁止嵌套 / Unicode 白名单）
src/fs/build.ts                           新增：由普通对象描述构建子树（静态内容复用）
src/fs/index.ts                           新增：初始树 + createFileSystem() + fileSystem 单例
src/fs/__tests__/path.spec.ts
src/fs/__tests__/vfs.spec.ts
src/fs/__tests__/mount.spec.ts
src/fs/__tests__/build.spec.ts
src/fs/__tests__/index.spec.ts
src/terminal/context/CommandContext.ts    扩展 vfs / mounts 字段（D-01）
src/terminal/executor/context.ts          会话访问器透传 vfs / mounts
src/commands/index.ts                     CommandRuntimeDeps 注入 fileSystem
src/stores/terminal.ts                    构建上下文时透传 vfs / mounts
```

**关键技术点**：

- **路径语义**：VFS 内部统一 POSIX 绝对路径；`.`、`..`、重复斜杠、结尾斜杠均需规范化；越界 `..` 停留在根。输入侧反斜杠在 `path` 层归一化为 `/`，VFS 内部与节点名不含 `\`；`~` 不展开（由命令层负责）。
- **只读与双契约**：一期 VFS 只读，命令与插件只拿到只读 `Vfs`；写能力收敛在核心内部 `MutableVfs`（`attachNode`/`detachNode`），仅挂载管理器可用，避免引入权限模型。
- **挂载**：核心 `MountApi` 提供 `mount(target, tree)`/`unmount(target)`/`list()`；子树挂到 `/mnt/**`，卸载后恢复原节点，节点 `parent` 指针由实现修正；白名单为 `/mnt` 下至少一级子目录（段非空、不含 `/`，允许 Unicode），其他目标拒绝并告警。
- **挂载失败可读**：`mount` 返回 `MountResult`（`invalid-target`/`parent-missing`/`invalid-tree`/`duplicate`/`nested`），`unmount` 返回 `boolean`，供 M6 的 `mount`/`unmount` 命令生成访客可见文案；一期禁止嵌套挂载。
- **初始树**：`/`、`/home/guest`、`/mnt` 存在；`/mnt` 初始为空目录，具体内容由 M6–M9 的插件在装配阶段通过 `api.mounts` 挂载。

**验收标准**：

- [ ] `/`、`/home/guest`、`/mnt` 可解析，根节点 `parent === null`，子节点 `parent` 正确。
- [ ] `resolve('/mnt/../home/./guest')` 得到 `/home/guest`；`resolve('/../../x')` 得到 `/x`。
- [ ] `readDir` 对不存在路径返回 `null`；`readFile` 对目录返回 `null`。
- [ ] 挂载 `/mnt/blog` 后能读取其子节点，`unmount` 后该路径恢复为空目录。
- [ ] `mount('/mnt/blog', tree)` 后子节点 `parent` 正确；目标不在 `/mnt/**` 白名单（如 `/home/guest`）时被拒绝并告警（`invalid-target`）。
- [ ] 重复挂载返回 `duplicate`、父子挂载返回 `nested`、父目录缺失返回 `parent-missing`；`/mnt/示例` 等 Unicode 目标允许。
- [ ] `buildTree` 由普通对象生成只读子树（文件/目录/meta），非法节点名抛错。
- [ ] `CommandContext.vfs` / `mounts` 必填并透传；`createFileSystem()` 实例之间挂载互不影响。
- [ ] 路径/树/挂载/构建器单测覆盖异常输入（空串、`/`、多重斜杠、尾斜杠、`.`/`..`、非法节点名）。
- [ ] 门禁通过。

**建议需求文档名**：`YYYYMMDD-01-虚拟文件系统与挂载.md`

---

### M4 核心导航命令（history / pwd / cd）

**目标**：终端具备完整的自我导航能力：`pwd`/`cd`/`history` 基于核心 VFS 与会话状态工作，提示符、目录切换与历史浏览保持一致。

**状态**：已完成（20261110 人工页面验收通过；需求文档 `20261110-03-核心导航命令.md`；20 个测试文件 / 220 个用例）。

**前置**：M3

**范围**：

- 包含：`history`、`pwd`、`cd`、`help` 排版打磨（`echo`/`help`/`clear` 已在 M2 落地）。
- 不包含：`cd -`（上一次目录）、变量展开 `$HOME`、命令别名、`ls`/`cat`（M5 核心命令）。

**交付物**：

```
src/commands/builtin/history.ts
src/commands/builtin/pwd.ts
src/commands/builtin/cd.ts
src/commands/builtin/help.ts                补充两列对齐、表头/页脚与 help <命令> 排版（M2 已有最小实现）
src/commands/builtin/index.ts               汇总导出（含 M2 的 echo/help/clear）
src/commands/builtin/__tests__/*.spec.ts    每个命令至少 1 正常 + 1 异常用例
src/terminal/context/CommandContext.ts      history 命令需要的历史快照字段（M2 未提供）
src/terminal/executor/context.ts            CommandSessionAccess 增加 getHistory 并拷贝快照
src/stores/terminal.ts                      buildContext 接入 getHistory
src/fs/path.ts                              isAbsolute 接受 `\` 前缀，兑现反斜杠归一化意图
```

**关键技术点**：

- **help**：M2 已从 `ctx.commands` 生成清单；M4 补充两列对齐、表头/页脚与 `help <命令>` 排版，仍禁止硬编码命令列表。
- **cd 语义**：无参数回到 `~`；支持绝对/相对路径、`~`、`.`、`..`；目标是文件时报「不是目录」；成功时静默；通过 `ctx.setCwd` 更新会话目录。
- **history 契约**：`CommandContext` 新增 `history` 快照（命令不得直接读 Store），`CommandSessionAccess.getHistory` 由 Store 接线；快照避免命令改写会话历史。
- **错误文案**：统一 `命令名: 中文描述`，如 `cd: 目录不存在: /mnt/xxx`。
- **clear 回归**：`clear` 已在 M2 命令化（`ctx.output.clear()`），本里程碑只做回归验证。
- **history 输出**：带行号输出；上限与 Store 保持一致（建议 1000 条，见 D-08）。

**验收标准**：

- [ ] `pwd` 输出当前虚拟目录；`cd /mnt` 后提示符路径段与 `pwd` 同步变化，`cd ~` 回到 `/home/guest`。
- [ ] `cd /mnt/nope` 输出错误且 `cwd` 不变；`cd` 指向文件时提示不是目录。
- [ ] `history` 显示带序号的历史；`clear` 清空输出但保留历史。
- [ ] `help` 列出全部已注册命令；`help cd` 展示用法；未知命令名给出提示。
- [ ] 门禁通过。

**建议需求文档名**：`YYYYMMDD-01-核心导航命令.md`

---

### M5 核心文件浏览命令（ls / cat）

**目标**：核心自带 `ls` 与 `cat`，在 M3 的 VFS 上完成目录浏览与文本读取；不依赖任何插件，安装插件前后行为一致。

**状态**：已完成（20261111 人工页面验收通过；`docs/demands/20261111-01-核心文件浏览命令.md`）。

**前置**：M4

**范围**：

- 包含：`ls [选项] [路径...]`（`-a` 显示 `.`/`..` 与隐藏文件、`-l` 长格式、多路径、目录 `/` 后缀、逐参数容错）；`cat [-n] <文件...>`（多文件、行号、目录/不存在/图片/二进制/200 KB 提示、末尾换行处理）。
- 不包含：`ls -R` 递归、`-h` 人类可读大小、`--color` 开关、多列自适应与目录着色（移交 M10）、权限位真实计算（只读树统一 `drwxr-xr-x` / `-rw-r--r--`）、排序选项、分页（`less`/`more`）、语法高亮、写入操作。

**交付物**：

```
src/commands/builtin/ls.ts
src/commands/builtin/cat.ts
src/commands/builtin/path-argument.ts          共享 ~ 展开 / 路径解析 / 选项校验
src/commands/builtin/__tests__/ls.spec.ts
src/commands/builtin/__tests__/cat.spec.ts
src/fs/home-content.ts                         home 只读示例内容（README / notes / .profile）
src/fs/__tests__/home-content.spec.ts
```

**关键技术点**：

- **归属**：`ls`/`cat` 都在 `src/commands/builtin/`，不进入 `plugins/`；原 D-04（`cat` 归哪个插件）作废。
- **输出格式**：`ls` 默认单列（一行一条），目录名追加 `/`；`-l` 每行一条（固定权限位 + UTF-8 字节大小 + 名称）；多列自适应与目录着色移交 M10（Q-02 已确认）。
- **路径解析**：共享 `path-argument.ts` 做 `~` 展开与 `resolve(cwd, …)`，再交给 VFS；不存在路径按参数逐个报错，不影响其他参数；`cd` 复用同一工具、行为不变。
- **`cat` 细节**：二进制识别按「`meta.mime` → 图片/二进制扩展名 → NUL 嗅探」，图片提示 `img`，其他二进制提示「无法以文本方式显示」；文件末尾无换行时补一次；单文件超过 200 KB 直接拒绝；`-n` 固定 6 位右对齐行号 + `\t`，多文件连续编号。

**验收标准**：

- [ ] `ls` 列出当前目录（home 示例内容），`ls /` / `ls notes` 列出指定目录，`ls /mnt /home` 支持多路径并输出表头与空行。
- [ ] `ls -a` 显示 `.` 与 `..`（根目录不显示 `..`）；`ls -l` 输出权限、UTF-8 字节大小、名称；目录与文件以 `/` 后缀区分；名称按中文/数字自然序。
- [ ] 不存在路径输出 `ls: 无法访问 xxx: 目录不存在`，其余参数继续输出；文件参数输出参数原文。
- [ ] `cat ~/README.md` 原样输出原文，缩进与空行保持不变；`cat -n` 输出 6 位右对齐行号，空行与多文件连续编号。
- [ ] 目录参数提示 `cat: xxx: 是一个目录`；不存在文件提示 `cat: xxx: 文件不存在`；图片提示改用 `img`；超过 200 KB 直接拒绝。
- [ ] 单测覆盖 `-a`、`-l`、多路径、不存在路径、`-n`、图片/二进制/阈值与排序；门禁通过。
- [ ] `/mnt/blog` 的 `ls` / `cat` 原文读取在 M8 插件挂载后回归。

**需求文档**：`docs/demands/20261111-01-核心文件浏览命令.md`（已完成）

> 20261111：M5 需求文档已审核通过（Q-01～Q-11 按建议执行），实现与门禁完成，并已通过人工页面验收。该文档把原「默认多列自适应 / 目录着色」定稿为「单列 + `/` 后缀」（多列与着色移交 M10），并补充 home 只读示例内容以便 `cat` 独立验收；`/mnt/blog` 相关的 `ls` / `cat` 验收移至 M8 挂载后回归。

---

### M6 内容挂载插件框架

**目标**：把「插件挂载内容 + 扩展命令」做成核心可复用的装载机制：插件通过核心 `PluginApi`/`MountApi` 挂载内容树、注册命令；后续内容插件（M8/M9）无需改动核心即可接入。

**状态**：已完成（20261111 人工页面验收通过；需求文档 `docs/demands/20261111-02-内容挂载插件框架.md`）。

**前置**：M3、M4

**范围**：

- 包含：`PluginApi`（registry/mounts/vfs/dataSource）、插件装载器（支持同步/异步 `install`、失败隔离、`runtime.ready` 门）、挂载点白名单与冲突策略、示例插件（挂载 `/mnt/demo`，并提供 `mount`/`unmount` 示例命令验证运行时挂载能力）。
- 不包含：远程插件安装/卸载、插件沙箱、真实本地目录（File System Access API）、界面上的插件管理入口。

**交付物**（最终路径以需求文档 4.1 为准）：

```
src/commands/loader.ts                     插件装载器：PluginApi / install / installPlugins
src/commands/index.ts                      装配扩展：plugins 参数、核心命令同步注册、ready、commands 实时视图
src/commands/plugins/demo/index.ts         示例插件：install 时挂载 /mnt/demo，注册 mount/unmount
src/commands/plugins/demo/tree.ts          示例内容与 createDemoTree()
src/terminal/executor/CommandExecutor.ts   执行前 await runtime.ready
src/commands/__tests__/loader.spec.ts      装载顺序、失败隔离、空插件、注册时机
src/commands/__tests__/runtime.spec.ts     ready、核心优先、挂载透传、实例隔离
```

**关键技术点**：

- **插件契约**：`CommandPlugin` 增加 `install?(api: PluginApi)`，`commands` 改为可选；核心按顺序 `await install`，单个插件抛错记录 `console.error` 后跳过，不阻断其他插件与终端启动。
- **挂载**：插件调用 `api.mounts.mount(target, tree)`；树由核心节点构造器/`build.ts` 生成；目标限 `/mnt/**`（至少一级子目录），`/`、`/home`、`/home/guest` 拒绝；同一目标重复挂载告警并保留先挂载者。
- **命令侧挂载能力**：`CommandContext.mounts` 暴露 `MountApi`，插件命令可通过 `ctx.mounts` 在运行时挂载/卸载，并用 `ctx.output` 输出结果（`mount`/`unmount` 即插件命令示例，核心不内置）。
- **就绪门**：`createCommandRuntime({ dataSource, vfs, mounts, plugins })` 返回 `ready`；执行器每次执行前 `await ready`，未来异步内容源不会出现「命令先于挂载」的竞态。
- **能力边界**：插件不得 import Store 或运行时单例；只读 `vfs` 仅用于查询，修改一律走 `mounts`。

**验收标准**：

- [ ] 装配顺序为「核心命令 → 插件按序 install」；单插件抛错不影响其他插件与终端可用性。
- [ ] 示例插件挂载 `/mnt/demo` 后，`ls /mnt/demo`、`cat /mnt/demo/<文件>` 可访问；`unmount` 后该路径恢复。
- [ ] 非法挂载点（`/`、`/home/guest`、`/tmp/x`）被拒绝并告警。
- [ ] 同一目标重复挂载告警且保留先挂载者。
- [ ] 示例插件的 `mount`/`unmount` 命令可在运行时挂载/卸载并通过 `ctx.output` 输出结果。
- [ ] `help` 自动包含插件命令；插件重名命令无法覆盖核心命令。
- [ ] 门禁通过。

**需求文档**：`docs/demands/20261111-02-内容挂载插件框架.md`（已完成）

> 20261111：M6 需求文档审核通过（Q-01～Q-11 按建议执行），实现与四项门禁完成（28 个测试文件 / 340 个用例），并已通过人工页面验收；下一里程碑为 M7 数据层与静态文章。

---

### M7 数据层与静态文章

**目标**：建立「命令只依赖 `DataSource` 接口」的数据访问基线，并准备示例文章内容。

**状态**：已完成（20261111；纯数据变更，自动化验收，无 GUI 人工验收；需求文档 `docs/demands/20261111-03-静态数据源与文章内容.md`）。

**前置**：M2；可与 M3–M6 并行。

**范围**：

- 包含：JSON 元数据清单、3 篇示例 Markdown 文章、`StaticDataSource`（运行时 `fetch` + 缓存 + 降级）、数据源单例（VFS 投影由 M8/M9 插件完成）。
- 不包含：Markdown 渲染（M8）、后端 API、文章搜索、分页。

**交付物**：

```
public/content/articles/index.json          元数据清单（id/title/date/excerpt/tags）
public/content/articles/*.md                3 篇中文示例（欢迎/关于/技术笔记）
src/data/static/catalog.ts                  元数据校验 / 排序 / 冻结（纯函数）
src/data/static/StaticDataSource.ts         运行时 fetch 加载（清单/正文/文章三级缓存、失败降级）
src/data/index.ts                           导出 dataSource 单例
src/data/__tests__/{catalog,StaticDataSource,articles}.spec.ts
```

**关键技术点**：

- **元数据来源**：`public/content/articles/index.json` 显式声明（用户评审指定），运行时加载后由 `catalog.ts` 校验；不解析 frontmatter、不写死在代码里。
- **正文加载**：资源放 `public/content/articles/`，运行时 `fetch`（按 `import.meta.env.BASE_URL` 拼 URL），构建期不内联；清单只请求一次，正文按 id 懒加载并缓存。
- **一致性校验**：`articles.spec.ts` 用 `node:fs` 断言清单 id 集合与 `.md` 文件名集合一致；缺文件、漏登记、字段非法、正文不可被 `cat` 读取均在测试期暴露。
- **失败降级**：网络错误、404、JSON 非法、结构非法均降级为 `[]` / `null` 并告警一次；失败不缓存，下次调用可重试；终端的其他命令不受影响。
- **异步契约**：`StaticDataSource` 返回 `Promise`，模拟未来 API 的异步形态，替换 `ApiDataSource` 时命令层无感。
- **单一数据源**：`cat` 看到的文章原文与 `blog read --raw` 来自同一份数据；M8 插件用同一清单投影 `/mnt/blog` 树，不复制内容。

**验收标准**：

- [ ] `fetchArticleList()` 通过运行时 `fetch` 按日期倒序返回摘要（不含正文），清单只请求一次。
- [ ] `fetchArticle(id)` 按需请求正文并返回完整内容；不存在返回 `null`，未知 id 不请求正文。
- [ ] 元数据与文章文件一一对应，单测全部通过；真实数据 `issues` 为空。
- [ ] 清单/正文请求失败时降级为 `[]` / `null` 并告警一次，可重试。
- [ ] 运行时装配使用 `dataSource` 单例，命令通过 `ctx.dataSource` 获取。
- [ ] `/mnt/blog` 下可看到 `hello.md` 等文件（在 M8 插件挂载后验证）。
- [ ] 门禁通过。

**需求文档**：`docs/demands/20261111-03-静态数据源与文章内容.md`（已完成）

> 20261111：M7 已按用户评审落地并完成自动化验收（状态：已完成，无 GUI 人工验收）：元数据改为 `public/content/articles/index.json`，正文为 3 篇 Markdown，运行时 `fetch` 加载并带缓存/降级/告警去重；`catalog.ts` 校验字段与唯一性并冻结结果。四项门禁通过（31 个测试文件 / 419 个用例；JS 101.28 kB / gzip 39.21 kB），`dist` 中文章资源独立发布、JS 不内联正文。

---

### M8 博客插件（Markdown 富文本）

**目标**：在终端内完成博客浏览闭环：列表 → 阅读（富文本）→ 纯文本查看 → 标签筛选。

**前置**：M6、M7

**范围**：

- 包含：`blog list`、`blog read <id>`、`blog read --raw <id>`、`blog tags`、`blog tag <tag>`；`markdown-it` 渲染与安全配置；Markdown 正文样式；插件 `install` 时把文章清单投影挂载到 `/mnt/blog`。
- 不包含：评论、搜索、分页、目录（TOC）交互、文章内图片点击放大、发布后台。

**交付物**：

```
package.json                                   新增 markdown-it 与 @types/markdown-it
src/markdown/render.ts                         渲染器（html:false / linkify / breaks / 链接规则）
src/markdown/escape.ts                         escapeHtml（meta 动态文本转义）
src/markdown/__tests__/render.spec.ts
src/markdown/__tests__/escape.spec.ts
src/commands/plugins/blog/index.ts             CommandPlugin 导出（install 挂载 /mnt/blog）
src/commands/plugins/blog/command.ts           blog 命令与子命令分发
src/commands/plugins/blog/tree.ts              文章清单 → VfsNode 子树（/mnt/blog/<id>.md）
src/commands/plugins/blog/format.ts            列表/标签/空态格式化
src/commands/plugins/blog/list.ts
src/commands/plugins/blog/read.ts
src/commands/plugins/blog/tags.ts
src/commands/plugins/blog/tag.ts
src/commands/plugins/blog/__tests__/*.spec.ts
src/commands/__tests__/blog-runtime.spec.ts    端到端（伪造 DataSource + 独立 VFS）
src/__tests__/setup.ts                         测试环境默认 fetch 桩
src/terminal/theme.css                         .md 正文样式（标题/代码/引用/表格/链接）
```

**关键技术点**：

- **渲染安全**：`markdown-it({ html: false, linkify: true, breaks: true })`，文章中的原始 HTML 不生效；链接统一 `target="_blank" rel="noopener noreferrer"`；输出前所有动态文本经 `escapeHtml`（D-06）。
- **两种查看方式**：默认富文本（`output.writeHtml`）；`--raw` 走纯文本（复用 `cat` 的读取逻辑或直接输出 `article.content`）。
- **列表格式**：`id`、日期、标题对齐展示；`blog tag <tag>` 复用列表格式并支持无结果提示。
- **错误文案**：未知 `id` 提示 `blog: 文章不存在: xxx，输入 blog list 查看全部文章`。
- **VFS 联动**：插件在 `install(api)` 时用 `api.mounts.mount('/mnt/blog', tree)` 挂载文章树（`tree` 由 `dataSource` 清单投影，文件名 `<id>.md`）；`blog` 命令与 `/mnt/blog` 树同源，`cat` 可直接读原文。

**验收标准**：

- [ ] `blog list` 按日期倒序展示全部文章（id/日期/标题）。
- [ ] `blog read <id>` 渲染标题、段落、列表、代码块、链接；代码块等宽可横向滚动，链接新窗口打开。
- [ ] `blog read --raw <id>` 输出纯文本原文，提示符不粘连。
- [ ] `blog tags` 展示标签及文章数；`blog tag <tag>` 过滤列表，无结果时给出提示。
- [ ] `cat /mnt/blog/<id>.md` 可读到同一篇原文。
- [ ] 单测覆盖：原始 HTML 被转义、未知 id、`--raw`、标签过滤。
- [ ] 门禁通过。

**建议需求文档名**：`YYYYMMDD-01-博客插件与Markdown渲染.md`

**需求文档**：`docs/demands/20261112-01-博客插件与Markdown渲染.md`（已完成）

> 20261112：M8 需求文档审核通过（Q-01～Q-12 按建议执行，`help` 条数修正为 11），实现与四项门禁完成（42 个测试文件 / 483 个用例），并已通过人工页面验收；下一里程碑为 M9 图片插件（img）。

---

### M9 图片插件（img）

**目标**：在终端输出区展示站内图片，完成「目录 → 文本 → 图片」三类内容浏览的最后一块拼图。

**前置**：M6、M7

**范围**：

- 包含：`img <路径>`；png/jpg/jpeg/gif/webp/svg；插件 `install` 时挂载示例画廊到 `/mnt/gallery`；图片自适应尺寸与说明文字。
- 不包含：上传、缩放交互、幻灯片、EXIF、视频/音频。

**交付物**：

```
src/commands/plugins/image/index.ts
src/commands/plugins/image/img.ts
src/commands/plugins/image/tree.ts            画廊清单 → VfsNode 子树（/mnt/gallery，meta.src）
src/commands/plugins/image/__tests__/img.spec.ts
src/data/static/gallery/index.ts              图片清单（url/mime/alt/说明）
src/data/static/gallery/*                     2 张示例图片
```

**关键技术点**：

- **命令名**：`img`（D-07），语义明确、短、不与常见 Linux 命令冲突。
- **渲染方式**：输出 `html` chunk，`<figure><img src alt loading="lazy"><figcaption>`；`max-width: 100%`，高度自适应，避免撑破终端布局。
- **资源来源**：示例图片用 `import.meta.glob('./gallery/*', { eager: true, query: '?url', import: 'default' })` 获取构建后 URL；VFS 节点 `meta.src` 保存该 URL；插件 `install(api)` 时用 `api.mounts.mount('/mnt/gallery', tree)` 挂载。
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
| 第 4 节 总体架构分层 | M1、M2、M3、M7 | 展示层、命令执行层、核心数据层 |
| 第 5 节 命令分类 | M4、M5、M8、M9 | 核心命令与插件命令 |
| 第 6 节 插件化命令架构 | M2、M6、M8、M9 | 契约与装载器在 M2/M6，插件挂载与命令在 M8/M9 |
| 第 7 节 VFS 与挂载 | M3、M6 | 核心 VFS 与 `MountApi`，插件装载器与挂载策略 |
| 第 8 节 博客集成方案 | M7、M8 | 数据与内容准备、插件挂载与渲染浏览 |
| 第 9 节 状态管理与数据流 | M1、M2、M3、M4 | 会话 Store、执行链路、`cwd` 变更 |
| 第 10 节 视觉与语言约定 | M1、M8、M10 | 主题、中文文案、Markdown 样式 |
| 第 11 节 构建与部署 | M10 | 构建、静态托管 |
| 第 12 节 约定与规范 | 全程 | 文档流程、需求/缺陷归档与索引 |

> 覆盖检查结论：架构文档中的每个功能点都能追溯到至少一个里程碑；无「规划了但无里程碑承载」的模块。

### 4.2 命令落地对照

| 命令 | 类别 | 里程碑 | 说明 |
| --- | --- | --- | --- |
| `echo` | 核心 | M2 | 首批核心命令，输出参数文本 |
| `history` | 核心 | M4 | 历史列表（带序号） |
| `help` | 核心 | M2 | 从 `ctx.commands` 生成清单（M4 做排版打磨） |
| `clear` | 核心 | M2 | 调用 `ctx.output.clear()`，保留历史 |
| `pwd` | 核心 | M4 | 输出 `cwd` |
| `cd` | 核心 | M4 | 基于 VFS 切换目录（`ctx.setCwd`） |
| `ls` | 核心 | M5 | `-a`/`-l`，多路径，单列 + `/` 后缀 |
| `cat` | 核心 | M5 | 文本读取；`-n`、多文件、图片/二进制识别；D-04 已作废 |
| `blog` | 插件（blog） | M8 | `list`/`read`/`read --raw`/`tags`/`tag`；插件挂载 `/mnt/blog` |
| `img` | 插件（image） | M9 | 插件挂载 `/mnt/gallery` |
| `mount` / `unmount` | 插件能力 | M6 | 插件命令通过 `ctx.mounts` 提供，核心不内置；用于展示运行时挂载/卸载 |

> 20261110 确认：VFS、路径、挂载与 `pwd`/`cd`/`ls`/`cat` 属核心（M3/M4/M5）；插件通过 `PluginApi` 挂载内容树并在 `install` 时注册命令，也可提供 `mount`/`unmount` 等挂载管理命令。

## 5. 待确认决策清单

以下问题会影响多个里程碑的契约或交互，建议在提交首个里程碑需求前先拍板；未拍板项按「建议方案」执行，并在对应需求文档中再次确认。

| 编号 | 待确认问题 | 可选项 | 建议方案 | 影响里程碑 |
| --- | --- | --- | --- | --- |
| D-01 | `CommandContext` 如何获得 VFS、`cd` 写入与命令清单 | ① 扩展 Context（`vfs`/`setCwd`/`commands`）；② 命令直接 import 全局 Store/单例 | ①：保持命令无全局依赖，便于单测与替换 | M3、M4 |
| D-02 | 命令名冲突策略 | ① 后注册覆盖；② 告警并保留先注册；③ 抛错 | ②：内置优先，插件冲突可见但不破坏启动 | M2 |
| D-03 | 输出块类型是否够用 | ① 仅 `text`/`html`；② 增加 `error`（错误色）与 `system`（提示色） | ②：错误与系统提示需要独立样式；`html` 仅承载受控富文本 | M1、M2 |
| D-04 | `cat` 归属（已作废） | — | 20261110 确认：文件系统属核心，`cat` 归核心命令（M5） | M5 |
| D-05 | 文章元数据来源 | ① frontmatter 解析；② 显式 JSON 清单（`public/content/articles/index.json`）；③ 文件名约定 | ②：零解析依赖、数据与代码分离、运行时加载后统一校验（20261111 M7 评审确认：由代码内清单改为 JSON 文件） | M7 |
| D-06 | Markdown 安全与渲染配置 | ① `html: false` + linkify；② 允许原始 HTML + DOMPurify | ①：内容由站主编写，无需 HTML 直通，减少依赖与 XSS 面 | M8 |
| D-07 | 图片命令名 | `img` / `view` / `open` / `pic` | `img`：短、语义明确、无命名冲突 | M9 |
| D-08 | 历史与输出持久化 | ① 仅内存；② 历史持久化到 localStorage | ①：隐私友好、刷新即净；输出设上限（建议 1000 chunk） | M1、M10 |
| D-09 | 输入捕获方案 | ① 隐藏 `<textarea>` + 自绘光标；② `contenteditable`；③ 可见输入框 | ①：粘贴/输入法/移动端兼容性最好，样式可控 | M1 |
| D-10 | Tab 补全范围 | ① 仅命令名；② 命令名 + 路径/参数 | ①：一期先保证命令发现性，路径补全进 Backlog | M10 |
| D-11 | 部署目标 | ① 根路径静态托管；② GitHub Pages 子路径；③ 暂不部署 | ①/③：先保证 `build` 可用，`base` 待目标确定后配置 | M10 |
| D-12 | 脚手架示例文件处理 | ① 删除 `counter.ts` 并改写 `App.spec.ts`；② 保留 | ①：避免示例代码与真实架构混淆 | M1 |
| D-13 | 是否引入 E2E 测试 | ① 一期不做，手工回归；② Playwright | ①：终端交互以组件测试 + 手工回归覆盖，控制依赖与工期 | M10 |

> 20261109：D-03 已随 M1 需求 `20261109-01` 审核确认，输出块最终为 `text`/`html`/`system`/`error`/`command` 五型。
>
> 20261110：D-01（上下文扩展 `commands`/`setCwd`/`vfs`/`mounts`）、D-02（保留先注册 + 告警）已确认；D-04 作废（`cat` 属核心命令）；文件系统与插件边界确认：VFS/路径/挂载与常用命令属核心，插件通过 `PluginApi`/`MountApi` 挂载内容树并注册命令（可提供 `mount`/`unmount` 等挂载管理命令）。M3 已按 D-01 落地 `vfs`/`mounts`（`MountApi` 返回 `MountResult`、一期禁止嵌套挂载、白名单允许 Unicode）。

## 6. 跨里程碑技术约定

以下约定建议在 M1 需求文档中一并冻结，后续里程碑沿用：

1. **路径**：VFS 内部一律 POSIX 绝对路径；节点名不含 `\`、`/`；命令接收的相对路径先基于 `cwd` 解析，再交给 VFS；访客输入的反斜杠在 `src/fs/path.ts` 归一化为 `/`（M4 起以 `\` 开头的路径按绝对路径解析）；`~` 由命令层展开。
2. **命令职责**：命令只通过 `CommandContext` 取数据、写输出；不得直接 import Pinia Store、`window`、`fetch` 或静态文件。
3. **错误处理**：可预期的失败（文件不存在、参数非法）由命令自行输出错误并正常返回；未捕获异常由执行器兜底为「系统错误」，不中断会话。
4. **错误文案**：统一 `命令名: 中文描述`；命令名与选项保持英文，面向访客的说明使用中文。
5. **输出转义**：凡拼入 `html` chunk 的动态文本必须经 `escapeHtml`；Markdown 渲染遵循 D-06。
6. **插件形态**：插件导出 `CommandPlugin`（`id` + 可选 `commands` + `install(api)`），装配时通过 `PluginApi` 获得 `registry`/`mounts`/`vfs`/`dataSource`，在 `install` 中挂载内容树并注册命令；插件命令可在运行时通过 `ctx.mounts` 提供 `mount`/`unmount` 等挂载管理能力，输出仍走 `ctx.output`。新增插件不修改终端核心。
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
- [ ] 插件挂载：`ls /mnt/blog`、`ls /mnt/gallery` 可见；`cat /mnt/blog/<id>.md` 可读；`help` 含插件命令。
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
| M2 命令内核 | 已完成 | `20261110-01-命令解析与执行内核.md` | 20261110 |
| M3 VFS 与挂载 | 已完成 | `20261110-02-虚拟文件系统与挂载.md` | 20261110 |
| M4 核心导航命令 | 已完成 | `20261110-03-核心导航命令.md` | 20261110 |
| M5 核心文件浏览命令 | 已完成 | `20261111-01-核心文件浏览命令.md` | 20261111 |
| M6 内容挂载插件框架 | 已完成 | `20261111-02-内容挂载插件框架.md` | 20261111 |
| M7 数据层与静态文章 | 已完成 | `20261111-03-静态数据源与文章内容.md` | 20261111 |
| M8 博客插件 | 已完成 | `20261112-01-博客插件与Markdown渲染.md` | 20261112 |
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
| 20261110 | M2 需求文档 `20261110-01-命令解析与执行内核.md` 创建并提交审核（状态：待审核） |
| 20261110 | 用户确认 M2 增加 `echo`/`help`/`clear` 三个核心命令（`clear` 提前接管）；确认文件系统归属：VFS/路径/挂载与 `pwd`/`cd`/`ls`/`cat` 属核心，插件通过核心接口挂载内容并可提供 `mount`/`unmount` 等命令；M4/M5/M6 相应重划 |
| 20261110 | M2 实现完成：解析器/注册表/执行器/上下文/装配与 `echo`/`help`/`clear`；84 个单测与 type-check/lint/build 全部通过，状态更新为「待验收」，等待人工页面验收 |
| 20261110 | M2 人工页面验收通过，状态更新为「已完成」（验收日期 20261110） |
| 20261110 | M3 需求文档 `20261110-02-虚拟文件系统与挂载.md` 创建并提交审核（状态：待审核；含 Q-01～Q-07 待确认项） |
| 20261110 | M3 需求审核通过，Q-01～Q-07 按建议执行（`MountApi` 定稿、`MountResult`、禁止嵌套、相对路径告警、仅人工回归、反斜杠归一化、Unicode 白名单） |
| 20261110 | M3 实现完成：`fs/path.ts`、`fs/vfs.ts`（只读 `Vfs` + 内部 `MutableVfs`）、`fs/mount.ts`（`MountApi`）、`fs/build.ts`、`fs/index.ts`；`CommandContext` 新增必填 `vfs`/`mounts`，运行时与 Store 接线；17 个测试文件 / 168 个用例与 type-check/lint/build 全部通过，状态更新为「待验收」，等待人工回归确认 |
| 20261110 | M3 人工回归确认通过（无可见退化），状态更新为「已完成」（验收日期 20261110）；下一里程碑为 M4 核心导航命令 |
| 20261110 | M4 需求文档 `20261110-03-核心导航命令.md` 创建并提交审核（状态：待审核；含 Q-01～Q-08 待确认项）；M4 交付物补充 `CommandContext.history`、`getHistory` 接线与 `isAbsolute` 反斜杠修正 |
| 20261110 | M4 需求审核通过（Q-01～Q-08 按建议执行）并完成实现：`pwd`/`cd`/`history`、`help` 排版打磨、`CommandContext.history` 契约与 `isAbsolute` 反斜杠修正；20 个测试文件 / 220 个用例与 type-check/lint/build 全部通过，状态更新为「待验收」，等待人工页面验收 |
| 20261110 | M4 人工页面验收通过（按 2.3 脚本逐项确认，无退化），状态更新为「已完成」（验收日期 20261110）；下一里程碑为 M5 核心文件浏览命令（`ls`/`cat`） |
| 20261111 | M5 需求文档 `20261111-01-核心文件浏览命令.md` 创建并提交审核（状态：待审核；含 Q-01～Q-11 待确认项）；补充 home 示例内容建议、`ls` 格式取舍、`cat` 分类与阈值，以及共享 `~` 展开方案 |
| 20261111 | M5 审核通过（Q-01～Q-11 按建议执行）并完成实现：`ls`/`cat`、共享 `path-argument.ts`、home 示例内容；23 个测试文件 / 269 个用例与 type-check/lint/build 全部通过，状态更新为「待验收」，等待人工页面验收 |
| 20261111 | M5 人工页面验收通过（按 2.3 脚本逐项确认，无退化），状态更新为「已完成」（验收日期 20261111）；下一里程碑为 M6 内容挂载插件框架 |
| 20261111 | M6 需求文档 `20261111-02-内容挂载插件框架.md` 创建并提交审核（状态：待审核；含 Q-01～Q-11 待确认项）；补充 `PluginApi`、装载器失败隔离、`ready` 就绪门、`/mnt/demo` 示例插件与 `mount`/`unmount` 示例命令方案 |
| 20261111 | M6 审核通过并完成实现：`PluginApi`/装载器/`ready` 就绪门、示例插件 demo（`/mnt/demo` + `mount`/`unmount`）、`path-argument.ts` 上移；28 个测试文件 / 340 个用例与 type-check/lint/build 全部通过，状态更新为「待验收」，等待人工页面验收 |
| 20261111 | M6 人工页面验收通过（按 2.3 脚本逐项确认，无退化），状态更新为「已完成」（验收日期 20261111）；下一里程碑为 M7 数据层与静态文章 |
| 20261111 | M7 需求文档 `20261111-03-静态数据源与文章内容.md` 创建并提交审核（状态：待审核；含 Q-01～Q-12 待确认项）；补充 3 篇示例文章规格、`?raw` 构建期内联、清单 ↔ 文件一致性校验、排序/冻结与「无可见变化、免 GUI 人工验收」的判定 |
| 20261111 | M7 评审调整并完成实现：元数据改为 `public/content/articles/index.json`、正文改为运行时 `fetch`（用户指定，取消构建期内联），新增 `catalog.ts` 校验与 `StaticDataSource` 缓存/降级；按用户意见「纯数据免人工验收」；31 个测试文件 / 419 个用例与 type-check/lint/build 全部通过，状态更新为「已完成」（验收日期 20261111）；下一里程碑为 M8 博客插件 |
| 20261112 | M8 需求文档 `20261112-01-博客插件与Markdown渲染.md` 创建并提交审核（状态：待审核；含 Q-01～Q-12 待确认项）；补充 `markdown-it` 渲染与安全配置、`blog` 五种子命令规格、`install` 预取并投影 `/mnt/blog`、`.md` 正文样式、启动请求变化与既有断言更新范围 |
| 20261112 | M8 审核通过并完成实现：`markdown-it` 渲染层、`blog list/read/--raw/tags/tag`、`install` 预取并挂载 `/mnt/blog`、`.md` 样式、测试 `fetch` 桩与 `setup.ts`；42 个测试文件 / 483 个用例与四项门禁全部通过，`help` 条数修正为 11；状态更新为「待验收」，等待人工页面验收 |
| 20261112 | M8 人工页面验收通过（按 2.3 脚本逐项确认，无退化），状态更新为「已完成」（验收日期 20261112）；下一里程碑为 M9 图片插件 |
