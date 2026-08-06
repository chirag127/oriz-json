import { describe, it, expect } from 'vitest'
import { diffJson, summarize, deepEqual } from './diff'

describe('diffJson', () => {
  it('detects add/remove/change', () => {
    const d = diffJson({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 })
    expect(d).toContainEqual({ path: 'b', kind: 'change', left: 2, right: 3 })
    expect(d).toContainEqual({ path: 'c', kind: 'add', right: 4 })
  })
  it('handles removed keys', () => {
    const d = diffJson({ a: 1, b: 2 }, { a: 1 })
    expect(d).toContainEqual({ path: 'b', kind: 'remove', left: 2 })
  })
  it('diffs arrays index-wise', () => {
    const d = diffJson([1, 2], [1, 9, 3])
    expect(d).toContainEqual({ path: '1', kind: 'change', left: 2, right: 9 })
    expect(d).toContainEqual({ path: '2', kind: 'add', right: 3 })
  })
  it('empty diff for equal', () => {
    expect(diffJson({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toEqual([])
  })
})

describe('summarize', () => {
  it('counts kinds', () => {
    const s = summarize(diffJson({ a: 1, b: 2 }, { a: 9, c: 3 }))
    expect(s.changed).toBe(1)
    expect(s.added).toBe(1)
    expect(s.removed).toBe(1)
  })
})

describe('deepEqual', () => {
  it('true for structurally equal', () => {
    expect(deepEqual({ a: [1, 2] }, { a: [1, 2] })).toBe(true)
  })
  it('false for different', () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
  })
})
