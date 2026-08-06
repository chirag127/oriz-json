import { describe, it, expect } from 'vitest'
import { parseJson, formatJson, minifyJson, sortKeys, jsonStats, byteLength, lineColFromPos } from './json'

describe('parseJson', () => {
  it('parses valid json', () => {
    const r = parseJson('{"a":1}')
    expect(r.ok).toBe(true)
    expect(r.value).toEqual({ a: 1 })
  })
  it('flags empty input', () => {
    expect(parseJson('   ').ok).toBe(false)
  })
  it('returns line/col on error', () => {
    const r = parseJson('{\n  "a": ,\n}')
    expect(r.ok).toBe(false)
    expect(r.line).toBeGreaterThan(0)
  })
})

describe('format / minify', () => {
  it('formats with indent', () => {
    expect(formatJson({ a: 1 }, 2)).toBe('{\n  "a": 1\n}')
  })
  it('minifies', () => {
    expect(minifyJson({ a: 1, b: [1, 2] })).toBe('{"a":1,"b":[1,2]}')
  })
})

describe('sortKeys', () => {
  it('sorts nested keys asc', () => {
    expect(minifyJson(sortKeys({ b: 1, a: { d: 4, c: 3 } }))).toBe('{"a":{"c":3,"d":4},"b":1}')
  })
  it('sorts desc', () => {
    expect(minifyJson(sortKeys({ a: 1, b: 2 }, true))).toBe('{"b":2,"a":1}')
  })
  it('keeps array order', () => {
    expect(minifyJson(sortKeys([{ b: 1, a: 2 }]))).toBe('[{"a":2,"b":1}]')
  })
})

describe('jsonStats', () => {
  it('counts structure', () => {
    const v = { a: [1, 2, { x: 1 }], b: 'y' }
    const s = jsonStats(v, 10)
    expect(s.objects).toBe(2)
    expect(s.arrays).toBe(1)
    expect(s.keys).toBe(3)
    expect(s.maxDepth).toBeGreaterThanOrEqual(2)
  })
})

describe('byteLength / lineCol', () => {
  it('utf8 bytes', () => {
    expect(byteLength('a')).toBe(1)
    expect(byteLength('€')).toBe(3)
  })
  it('line col from pos', () => {
    expect(lineColFromPos('ab\ncd', 4)).toEqual({ line: 2, col: 2 })
  })
})
