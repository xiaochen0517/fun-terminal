import type { OutputBuffer, OutputChunk } from '@/terminal/context/OutputBuffer'

/** 输出缓冲的最小写入目标；Store 与测试均可实现 */
export interface OutputSink {
  readonly chunks: readonly OutputChunk[]
  append(chunk: OutputChunk): void
  clear(): void
}

/** 创建一个绑定到指定 sink 的输出缓冲 */
export function createOutputBuffer(sink: OutputSink): OutputBuffer {
  return {
    write(text) {
      sink.append({ type: 'text', content: text })
    },
    writeHtml(html) {
      sink.append({ type: 'html', content: html })
    },
    push(chunk) {
      sink.append(chunk)
    },
    clear() {
      sink.clear()
    },
    get chunks() {
      return sink.chunks
    },
  }
}
