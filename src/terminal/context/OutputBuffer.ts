/**
 * 输出缓冲（OutputBuffer）
 *
 * 命令通过 OutputBuffer 向终端写内容。设计为流式缓冲，支持：
 * - 普通文本输出
 * - 富文本（HTML）输出（用于博客 md 渲染等场景）
 * - 系统提示与错误输出
 * - 命令回显（由终端核心写入）
 * - 清屏操作
 */

/** 普通文本输出 */
export interface TextChunk {
  type: 'text'
  content: string
}

/** 受控富文本输出 */
export interface HtmlChunk {
  type: 'html'
  content: string
}

/** 系统提示输出（欢迎语、临时提示等） */
export interface SystemChunk {
  type: 'system'
  content: string
}

/** 错误输出 */
export interface ErrorChunk {
  type: 'error'
  content: string
}

/** 命令回显：记录执行时的 cwd，保证提示符与历史一致 */
export interface CommandChunk {
  type: 'command'
  cwd: string
  input: string
}

/** 单条输出内容 */
export type OutputChunk = TextChunk | HtmlChunk | SystemChunk | ErrorChunk | CommandChunk

/** 输出缓冲接口 */
export interface OutputBuffer {
  /** 追加纯文本输出 */
  write(text: string): void
  /** 追加富文本（HTML）输出 */
  writeHtml(html: string): void
  /** 追加单条输出块 */
  push(chunk: OutputChunk): void
  /** 清空输出（对应 clear 命令） */
  clear(): void
  /** 当前已缓冲的所有输出 */
  readonly chunks: readonly OutputChunk[]
}
