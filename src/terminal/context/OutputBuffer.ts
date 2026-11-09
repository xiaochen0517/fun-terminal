/**
 * 输出缓冲（OutputBuffer）
 *
 * 命令通过 OutputBuffer 向终端写内容。设计为流式缓冲，支持：
 * - 普通文本输出
 * - 富文本（HTML）输出（用于博客 md 渲染等场景）
 * - 清屏操作
 *
 * 本文件仅定义接口，具体实现留待功能开发阶段。
 */

/** 单条输出内容，支持纯文本或富文本 */
export interface OutputChunk {
  /** 输出类型：text 为纯文本，html 为富文本 */
  type: 'text' | 'html'
  /** 输出内容 */
  content: string
}

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
