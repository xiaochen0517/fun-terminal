# 静态数据源（static）

`DataSource` 的静态实现：**元数据用 JSON 声明，正文是 Markdown 文件，运行时通过 `fetch` 按需加载**，不把内容打进命令代码。

## 文件与职责

| 文件 | 职责 |
| --- | --- |
| `catalog.ts` | 元数据校验、归一化、排序与冻结（纯函数，无 fetch / Store 依赖） |
| `StaticDataSource.ts` | 加载清单与正文、缓存、失败降级；`fetch` 与 `baseUrl` 可注入 |

文章资源不在本目录，而在 `public/content/articles/`：

```
public/content/articles/
├── index.json      # 元数据清单 { "articles": [ { id, title, date, excerpt, tags } ] }
├── hello.md
├── about.md
└── vfs-notes.md
```

## 运行时行为

- 清单与正文按 `import.meta.env.BASE_URL` 拼 URL，兼容 `/` 与子路径部署（如 `/site/`）。
- 清单只请求一次；正文按 `id` 懒加载并缓存，重复阅读不重复请求。
- 网络错误、404、JSON 非法、字段非法都降级为「空列表 / `null`」，并只告警一次；失败不缓存，下次调用可重试。
- 返回的摘要与文章已冻结，`fetchArticleList()` 每次返回新数组。

## 新增一篇文章

1. 在 `public/content/articles/` 新增 `<id>.md`（`id` 为小写 kebab-case，文件名即 id）。
2. 在 `public/content/articles/index.json` 的 `articles` 数组登记同一条元数据。
3. 运行 `npm run test:unit -- --run src/data`：缺文件、漏登记、字段非法、正文不可被 `cat` 读取都会在测试中暴露。

字段规则：`id` 小写 kebab-case（≤ 64）；`title` 单行非空（≤ 120）；`date` 为 `YYYY-MM-DD` 真实日期；`excerpt` 单行非空（≤ 200）；`tags` 1–8 个无空白且不重复的词（每个 ≤ 24）。正文以恰好一个换行结尾，不含 NUL，不超过 200 KB。
