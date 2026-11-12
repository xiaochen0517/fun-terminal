import { describe, expect, it } from 'vitest'

import { escapeHtml } from '@/markdown/escape'

describe('escapeHtml', () => {
  it('escapes the five HTML-sensitive characters', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
  })

  it('does not double-escape existing named entities', () => {
    const escaped = '&amp; &lt; &gt; &quot; &#39;'

    expect(escapeHtml(escaped)).toBe(escaped)
    expect(escapeHtml(escapeHtml('<x>'))).toBe('&lt;x&gt;')
  })

  it('escapes a bare ampersand and unknown entities', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
    expect(escapeHtml('&unknown;')).toBe('&amp;unknown;')
  })

  it('returns an empty string unchanged', () => {
    expect(escapeHtml('')).toBe('')
  })
})
