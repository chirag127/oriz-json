/** Flatten a nested value into dot/bracket path → primitive rows. */
export interface FlatRow {
  path: string
  value: unknown
}

export function flatten(value: unknown, prefix = ''): FlatRow[] {
  const rows: FlatRow[] = []
  const rec = (v: unknown, path: string) => {
    if (Array.isArray(v)) {
      if (v.length === 0) rows.push({ path, value: [] })
      v.forEach((item, i) => rec(item, path ? `${path}.${i}` : String(i)))
    } else if (v && typeof v === 'object') {
      const entries = Object.entries(v as Record<string, unknown>)
      if (entries.length === 0) rows.push({ path, value: {} })
      for (const [k, val] of entries) rec(val, path ? `${path}.${k}` : k)
    } else {
      rows.push({ path, value: v })
    }
  }
  rec(value, prefix)
  return rows
}

const NEEDS_QUOTE = /[",\n\r]/

function csvCell(v: unknown): string {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  return NEEDS_QUOTE.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * JSON → CSV. Input must be an array of objects (rows) OR array of primitives.
 * Column union is derived from all row keys, order = first-seen.
 */
export function jsonToCsv(value: unknown, delimiter = ','): string {
  if (!Array.isArray(value)) throw new Error('CSV export needs a top-level JSON array')
  if (value.length === 0) return ''
  const allObjects = value.every((r) => r && typeof r === 'object' && !Array.isArray(r))
  if (!allObjects) {
    // array of scalars/mixed → single "value" column
    const header = 'value'
    const body = value.map((r) => csvCell(r)).join('\n')
    return `${header}\n${body}`
  }
  const cols: string[] = []
  for (const row of value) {
    for (const k of Object.keys(row as Record<string, unknown>)) {
      if (!cols.includes(k)) cols.push(k)
    }
  }
  const head = cols.map(csvCell).join(delimiter)
  const lines = (value as Record<string, unknown>[]).map((row) =>
    cols.map((c) => csvCell(row[c])).join(delimiter),
  )
  return [head, ...lines].join('\n')
}

/** Split a CSV line respecting quotes. */
export function splitCsvLine(line: string, delimiter = ','): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuotes = false
      } else cur += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

function coerce(s: string): unknown {
  if (s === '') return ''
  if (s === 'true') return true
  if (s === 'false') return false
  if (s === 'null') return null
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return Number(s)
  return s
}

/** CSV → JSON array of objects. First row = header. */
export function csvToJson(text: string, delimiter = ','): unknown[] {
  const rows = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((r, i, a) => r !== '' || i < a.length - 1)
  const nonEmpty = rows.filter((r) => r.trim() !== '')
  if (nonEmpty.length === 0) return []
  const header = splitCsvLine(nonEmpty[0], delimiter)
  return nonEmpty.slice(1).map((line) => {
    const cells = splitCsvLine(line, delimiter)
    const obj: Record<string, unknown> = {}
    header.forEach((h, i) => {
      obj[h] = coerce(cells[i] ?? '')
    })
    return obj
  })
}
