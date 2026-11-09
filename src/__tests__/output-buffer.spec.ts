import { describe, expect, it } from 'vitest'

import { createOutputBuffer } from '@/terminal/context/buffer'
import type { OutputChunk } from '@/terminal/context/OutputBuffer'

function createTestSink() {
  const chunks: OutputChunk[] = []

  return {
    chunks,
    sink: {
      get chunks() {
        return chunks
      },
      append(chunk: OutputChunk) {
        chunks.push(chunk)
      },
      clear() {
        chunks.splice(0, chunks.length)
      },
    },
  }
}

describe('createOutputBuffer', () => {
  it('writes text and html chunks', () => {
    const { chunks, sink } = createTestSink()
    const buffer = createOutputBuffer(sink)

    buffer.write('hello')
    buffer.writeHtml('<b>hi</b>')

    expect(chunks).toEqual([
      { type: 'text', content: 'hello' },
      { type: 'html', content: '<b>hi</b>' },
    ])
    expect(buffer.chunks).toEqual(chunks)
  })

  it('pushes arbitrary chunks and clears them', () => {
    const { chunks, sink } = createTestSink()
    const buffer = createOutputBuffer(sink)

    buffer.push({ type: 'command', cwd: '/home/guest', input: 'ls' })
    expect(buffer.chunks).toHaveLength(1)

    buffer.clear()
    expect(buffer.chunks).toEqual([])
    expect(chunks).toEqual([])
  })
})
