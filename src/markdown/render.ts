/**
 * Markdown 渲染器
 *
 * 纯函数模块：Markdown 原文 → HTML 片段，不依赖 Vue / Store / VFS。
 * 配置遵循 D-06：
 * - `html: false`：原始 HTML 一律转义；
 * - `linkify: true`：裸 URL 自动成链接；
 * - `breaks: true`：单换行转 `<br>`；
 * - `typographer: false`：不改写引号 / 破折号；
 * - 所有链接新窗口打开，并阻断 `window.opener`。
 *
 * 外层 `<article class="md">` 与 meta 由 `blog read` 组装，渲染器只负责正文片段。
 */

import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
})

md.renderer.rules.link_open = (tokens, idx, options, _env, self) => {
  const token = tokens[idx]
  if (!token) return ''

  if (token.attrGet('target') === null) token.attrSet('target', '_blank')
  if (token.attrGet('rel') === null) token.attrSet('rel', 'noopener noreferrer')
  return self.renderToken(tokens, idx, options)
}

/** 渲染 Markdown 原文为 HTML 片段；非字符串输入返回空串，避免命令层抛错 */
export function renderMarkdown(source: string): string {
  if (typeof source !== 'string' || source === '') return ''
  return md.render(source)
}
