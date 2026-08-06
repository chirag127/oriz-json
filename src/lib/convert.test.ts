import { describe, it, expect } from 'vitest'
import { jsonToCsv, csvToJson, splitCsvLine, flatten } from './convert'

describe('jsonToCsv', () => {
  it('array of objects with union columns', () => {
    const csv = jsonToCsv([{ a: 1, b: 2 }, { a: 3, c: 4 }])
    expect(csv).toBe('a,b,c\n1,2,\n3,,4')
  })
  it('quotes cells with commas', () => {
    expect(jsonToCsv([{ a: 'x,y' }])).toBe('a\n"x,y"')
  })
  it('array of scalars → value column', () => {
    expect(jsonToCsv([1, 2, 3])).toBe('value\n1\n2\n3')
  })
  it('throws on non-array', () => {
    expect(() => jsonToCsv({ a: 1 })).toThrow()
  })
})

describe('csvToJson', () => {
  it('parses with header + coercion', () => {
    expect(csvToJson('a,b\n1,true\n2,false')).toEqual([
      { a: 1, b: true },
      { a: 2, b: false },
    ])
  })
  it('roundtrips through jsonToCsv', () => {
    const data = [{ x: 1, y: 'hi' }, { x: 2, y: 'yo' }]
    expect(csvToJson(jsonToCsv(data))).toEqual(data)
  })
})

describe('splitCsvLine', () => {
  it('handles escaped quotes', () => {
    expect(splitCsvLine('"a""b",c')).toEqual(['a"b', 'c'])
  })
})

describe('flatten', () => {
  it('produces dot paths', () => {
    const rows = flatten({ a: { b: 1 }, c: [2, 3] })
    expect(rows).toContainEqual({ path: 'a.b', value: 1 })
    expect(rows).toContainEqual({ path: 'c.0', value: 2 })
  })
})
