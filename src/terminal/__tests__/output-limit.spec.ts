import { describe, expect, it } from 'vitest'

import { capOutput, MAX_OUTPUT_CHUNKS, TRUNCATION_NOTICE } from '@/terminal/output-limit'
import type { OutputChunk } from '@/terminal/context/OutputBuffer'

function text(content: string): OutputChunk {
  return { type: 'text', content }
}

const notice: OutputChunk = { type: 'system', content: TRUNCATION_NOTICE }

describe('capOutput', () => {
  it('未超限时原样返回且不截断', () => {
    const chunks = [text('a'), text('b')]
    expect(capOutput(chunks, false)).toBe(false)
    expect(chunks).toEqual([text('a'), text('b')])
  })

  it('恰好等于上限时不截断', () => {
    const chunks = [text('0'), text('1'), text('2')]
    expect(capOutput(chunks, false, 3)).toBe(false)
    expect(chunks).toEqual([text('0'), text('1'), text('2')])
  })

  it('首次超限时丢弃最旧并插入截断提示', () => {
    const chunks = [text('0'), text('1'), text('2'), text('3')]
    expect(capOutput(chunks, false, 3)).toBe(true)
    expect(chunks).toEqual([notice, text('2'), text('3')])
  })

  it('已截断后再超限只丢 index 1 起的最旧、不重复插入提示', () => {
    const chunks = [notice, text('2'), text('3'), text('4')]
    expect(capOutput(chunks, true, 3)).toBe(true)
    expect(chunks).toEqual([notice, text('3'), text('4')])
  })

  it('默认上限与截断提示文本一致', () => {
    const chunks = Array.from({ length: MAX_OUTPUT_CHUNKS + 1 }, (_, index) => text(String(index)))
    expect(capOutput(chunks, false)).toBe(true)
    expect(chunks).toHaveLength(MAX_OUTPUT_CHUNKS)
    expect(chunks[0]).toEqual(notice)
    expect(TRUNCATION_NOTICE).toContain('1000')
  })
})
