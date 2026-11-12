/**
 * HTML 转义
 *
 * 命令拼进 `html` chunk 的动态文本（日期、标签等）必须先经过这里；
 * Markdown 正文本身由 `markdown-it` 负责转义，不需要二次处理。
 *
 * 对五个字符做转义，并保留已有的命名实体，避免二次转义把 `&amp;`
 * 变成 `&amp;amp;`（幂等）。
 */

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const ESCAPE_PATTERN = /[<>"']|&(?!(?:amp|lt|gt|quot|#39);)/g

/** 转义 `& < > " '`；已有 `&amp;` 等命名实体保持不变 */
export function escapeHtml(text: string): string {
  return text.replace(ESCAPE_PATTERN, (character) => ESCAPES[character] ?? character)
}
