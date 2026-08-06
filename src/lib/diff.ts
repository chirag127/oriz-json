export type DiffKind = 'add' | 'remove' | 'change' | 'unchanged'

export interface DiffEntry {
  path: string
  kind: DiffKind
  left?: unknown
  right?: unknown
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Deep structural diff. Arrays compared index-wise. Returns flat entries. */
export function diffJson(left: unknown, right: unknown, path = ''): DiffEntry[] {
  const out: DiffEntry[] = []
  const rec = (l: unknown, r: unknown, p: string) => {
    if (isObj(l) && isObj(r)) {
      const keys = new Set([...Object.keys(l), ...Object.keys(r)])
      for (const k of [...keys].sort()) {
        const cp = p ? `${p}.${k}` : k
        if (!(k in l)) out.push({ path: cp, kind: 'add', right: r[k] })
        else if (!(k in r)) out.push({ path: cp, kind: 'remove', left: l[k] })
        else rec(l[k], r[k], cp)
      }
      return
    }
    if (Array.isArray(l) && Array.isArray(r)) {
      const len = Math.max(l.length, r.length)
      for (let i = 0; i < len; i++) {
        const cp = p ? `${p}.${i}` : String(i)
        if (i >= l.length) out.push({ path: cp, kind: 'add', right: r[i] })
        else if (i >= r.length) out.push({ path: cp, kind: 'remove', left: l[i] })
        else rec(l[i], r[i], cp)
      }
      return
    }
    if (!deepEqual(l, r)) out.push({ path: p || '(root)', kind: 'change', left: l, right: r })
  }
  rec(left, right, path)
  return out
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((x, i) => deepEqual(x, b[i]))
  }
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    if (ka.length !== kb.length) return false
    return ka.every((k) => k in b && deepEqual(a[k], b[k]))
  }
  return false
}

export interface DiffSummary {
  added: number
  removed: number
  changed: number
  total: number
}

export function summarize(entries: DiffEntry[]): DiffSummary {
  const s: DiffSummary = { added: 0, removed: 0, changed: 0, total: entries.length }
  for (const e of entries) {
    if (e.kind === 'add') s.added++
    else if (e.kind === 'remove') s.removed++
    else if (e.kind === 'change') s.changed++
  }
  return s
}
