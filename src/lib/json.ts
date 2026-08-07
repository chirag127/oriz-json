export interface ParseResult {
  ok: boolean
  value?: unknown
  error?: string
  line?: number
  col?: number
}

/** Parse JSON with a friendly error carrying line/col derived from position. */
export function parseJson(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'Empty input' }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const lc = msg.match(/line (\d+) column (\d+)/i)
    if (lc) return { ok: false, error: msg, line: Number(lc[1]), col: Number(lc[2]) }
    const pos = posFromMessage(msg) ?? findErrorPos(text)
    const { line, col } = lineColFromPos(text, pos)
    return { ok: false, error: msg, line, col }
  }
}

function posFromMessage(msg: string): number | null {
  const m = msg.match(/position (\d+)/i)
  return m ? Number(m[1]) : null
}

/** Best-effort error position when the engine message omits one. */
function findErrorPos(text: string): number {
  const m = text.match(/[,:]\s*(?=[,}\]])|,(?=\s*[}\]])/)
  if (m && m.index != null) return m.index + m[0].length
  return Math.max(0, text.replace(/\s+$/, '').length - 1)
}

export function lineColFromPos(text: string, pos: number): { line: number; col: number } {
  let line = 1
  let col = 1
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === '\n') {
      line++
      col = 1
    } else col++
  }
  return { line, col }
}

/** Pretty-print with a given indent (number of spaces or "\t"). */
export function formatJson(value: unknown, indent: number | '\t' = 2): string {
  return JSON.stringify(value, null, indent)
}

/** Minify: no whitespace. */
export function minifyJson(value: unknown): string {
  return JSON.stringify(value)
}

/** Recursively sort object keys (arrays keep order). Stable, deterministic. */
export function sortKeys(value: unknown, desc = false): unknown {
  if (Array.isArray(value)) return value.map((v) => sortKeys(v, desc))
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      desc ? b.localeCompare(a) : a.localeCompare(b),
    )
    const out: Record<string, unknown> = {}
    for (const [k, v] of entries) out[k] = sortKeys(v, desc)
    return out
  }
  return value
}

export interface JsonStats {
  bytes: number
  keys: number
  arrays: number
  objects: number
  maxDepth: number
  nodes: number
}

/** Walk a parsed value and collect structure stats. */
export function jsonStats(value: unknown, byteLen: number): JsonStats {
  let keys = 0
  let arrays = 0
  let objects = 0
  let maxDepth = 0
  let nodes = 0
  const walk = (v: unknown, depth: number) => {
    nodes++
    if (depth > maxDepth) maxDepth = depth
    if (Array.isArray(v)) {
      arrays++
      for (const item of v) walk(item, depth + 1)
    } else if (v && typeof v === 'object') {
      objects++
      for (const [, val] of Object.entries(v as Record<string, unknown>)) {
        keys++
        walk(val, depth + 1)
      }
    }
  }
  walk(value, 0)
  return { bytes: byteLen, keys, arrays, objects, maxDepth, nodes }
}

/** UTF-8 byte length of a string. */
export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length
}
