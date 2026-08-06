import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { downloadBlob, onDropZone, formatBytes, readAsText } from '@chirag127/oz-file'
import {
  parseJson,
  formatJson,
  minifyJson,
  sortKeys,
  jsonStats,
  byteLength,
} from '../lib/json'
import JsonTree from './JsonTree'
import type { DiffEntry } from '../lib/diff'

type Tab = 'format' | 'tree' | 'query' | 'convert' | 'diff' | 'ai'

const TABS: { id: Tab; label: string }[] = [
  { id: 'format', label: 'Format / Validate' },
  { id: 'tree', label: 'Tree' },
  { id: 'query', label: 'JSONPath' },
  { id: 'convert', label: 'JSON ↔ CSV' },
  { id: 'diff', label: 'Diff' },
  { id: 'ai', label: 'AI' },
]

const SAMPLE = `{
  "name": "oriz-json",
  "client_side": true,
  "features": ["format", "validate", "tree", "jsonpath", "csv", "diff", "sort"],
  "tree": {
    "trunk": { "branch": [1, 2, { "leaf": "amber" }] },
    "roots": null
  },
  "count": 7
}`

function useDropZone(onFiles: (f: File[]) => void) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    return onDropZone(el, onFiles)
  }, [onFiles])
  return ref
}

export default function JsonStudio() {
  const [tab, setTab] = useState<Tab>('format')
  const [text, setText] = useState('')
  const [indent, setIndent] = useState<'2' | '4' | 'tab'>('2')
  const [copied, setCopied] = useState('')

  const parsed = useMemo(() => parseJson(text), [text])
  const stats = useMemo(
    () => (parsed.ok ? jsonStats(parsed.value, byteLength(text)) : null),
    [parsed, text],
  )

  const dropRef = useDropZone(
    useCallback((files: File[]) => {
      const f = files[0]
      if (f) readAsText(f).then(setText)
    }, []),
  )

  const copy = useCallback((val: string, label = 'output') => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(''), 1200)
    })
  }, [])

  const indentVal = indent === 'tab' ? '\t' : Number(indent)

  const doFormat = () => {
    if (parsed.ok) setText(formatJson(parsed.value, indentVal))
  }
  const doMinify = () => {
    if (parsed.ok) setText(minifyJson(parsed.value))
  }
  const doSort = (desc: boolean) => {
    if (parsed.ok) setText(formatJson(sortKeys(parsed.value, desc), indentVal))
  }

  return (
    <div className="studio">
      <nav className="tabs" role="tablist" aria-label="Tools">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="editor-shell">
        <div className="editor-col">
          <div className="editor-toolbar">
            <span className="editor-label">Input JSON</span>
            <div className="editor-actions">
              <button className="chip" onClick={() => setText(SAMPLE)}>
                Sample
              </button>
              <label className="chip">
                Open file
                <input
                  type="file"
                  accept=".json,application/json,text/plain,.csv,.txt"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) readAsText(f).then(setText)
                  }}
                />
              </label>
              <button className="chip" onClick={() => setText('')} disabled={!text}>
                Clear
              </button>
            </div>
          </div>
          <textarea
            ref={dropRef}
            className="editor"
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste JSON, drop a file, or click Sample…"
            aria-label="JSON input"
          />
          <StatusBar parsed={parsed} stats={stats} text={text} />
        </div>

        <div className="panel-col">
          {tab === 'format' && (
            <FormatPanel
              parsed={parsed}
              text={text}
              indent={indent}
              setIndent={setIndent}
              onFormat={doFormat}
              onMinify={doMinify}
              onSort={doSort}
              onCopy={copy}
              copied={copied}
            />
          )}
          {tab === 'tree' && <TreePanel parsed={parsed} />}
          {tab === 'query' && <QueryPanel parsed={parsed} onCopy={copy} copied={copied} />}
          {tab === 'convert' && <ConvertPanel text={text} setText={setText} onCopy={copy} copied={copied} />}
          {tab === 'diff' && <DiffPanel left={text} />}
          {tab === 'ai' && <AiPanel parsed={parsed} text={text} setText={setText} />}
        </div>
      </div>
    </div>
  )
}

function StatusBar({
  parsed,
  stats,
  text,
}: {
  parsed: ReturnType<typeof parseJson>
  stats: ReturnType<typeof jsonStats> | null
  text: string
}) {
  if (!text.trim())
    return (
      <div className="status status--idle">
        <span className="dot" /> Waiting for input
      </div>
    )
  if (!parsed.ok)
    return (
      <div className="status status--err" role="alert">
        <span className="dot" /> Invalid JSON — {parsed.error}
        {parsed.line != null && ` (line ${parsed.line}, col ${parsed.col})`}
      </div>
    )
  return (
    <div className="status status--ok">
      <span className="dot" /> Valid JSON
      {stats && (
        <span className="status-meta">
          {formatBytes(stats.bytes)} · {stats.nodes} nodes · {stats.keys} keys · depth{' '}
          {stats.maxDepth}
        </span>
      )}
    </div>
  )
}

function Output({ value, copied, onCopy, filename }: { value: string; copied: string; onCopy: (v: string, l?: string) => void; filename: string }) {
  return (
    <div className="output">
      <div className="output-actions">
        <button className="chip" onClick={() => onCopy(value, 'output')}>
          {copied === 'output' ? 'Copied!' : 'Copy'}
        </button>
        <button
          className="chip"
          onClick={() => downloadBlob(new Blob([value], { type: 'application/json' }), filename)}
        >
          Download
        </button>
      </div>
      <pre className="output-pre">{value}</pre>
    </div>
  )
}

function FormatPanel({
  parsed,
  text,
  indent,
  setIndent,
  onFormat,
  onMinify,
  onSort,
  onCopy,
  copied,
}: {
  parsed: ReturnType<typeof parseJson>
  text: string
  indent: '2' | '4' | 'tab'
  setIndent: (v: '2' | '4' | 'tab') => void
  onFormat: () => void
  onMinify: () => void
  onSort: (desc: boolean) => void
  onCopy: (v: string, l?: string) => void
  copied: string
}) {
  return (
    <div className="pane">
      <div className="pane-head">
        <h2>Format, minify, sort</h2>
      </div>
      <div className="controls">
        <label className="field">
          Indent
          <select value={indent} onChange={(e) => setIndent(e.target.value as '2' | '4' | 'tab')}>
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </label>
        <button className="btn btn--primary" onClick={onFormat} disabled={!parsed.ok}>
          Beautify
        </button>
        <button className="btn" onClick={onMinify} disabled={!parsed.ok}>
          Minify
        </button>
        <button className="btn" onClick={() => onSort(false)} disabled={!parsed.ok}>
          Sort keys A→Z
        </button>
        <button className="btn" onClick={() => onSort(true)} disabled={!parsed.ok}>
          Sort Z→A
        </button>
      </div>
      {parsed.ok ? (
        <Output
          value={text}
          copied={copied}
          onCopy={onCopy}
          filename="formatted.json"
        />
      ) : (
        <EmptyState text={text} />
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty">
      {text.trim() ? 'Fix the JSON to see output here.' : 'Paste or drop JSON to begin.'}
    </div>
  )
}

function TreePanel({ parsed }: { parsed: ReturnType<typeof parseJson> }) {
  return (
    <div className="pane">
      <div className="pane-head">
        <h2>Tree viewer</h2>
      </div>
      {parsed.ok ? <JsonTree data={parsed.value} /> : <EmptyState text="" />}
    </div>
  )
}

function QueryPanel({
  parsed,
  onCopy,
  copied,
}: {
  parsed: ReturnType<typeof parseJson>
  onCopy: (v: string, l?: string) => void
  copied: string
}) {
  const [q, setQ] = useState('$..*')
  const [result, setResult] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const run = useCallback(async () => {
    if (!parsed.ok) return
    setBusy(true)
    setErr('')
    try {
      const { JSONPath } = await import('jsonpath-plus')
      const res = JSONPath({ path: q, json: parsed.value as object })
      setResult(JSON.stringify(res, null, 2))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      setResult('')
    } finally {
      setBusy(false)
    }
  }, [q, parsed])

  return (
    <div className="pane">
      <div className="pane-head">
        <h2>JSONPath query</h2>
        <a className="hint" href="https://github.com/JSONPath-Plus/JSONPath#syntax" target="_blank" rel="noopener">
          syntax
        </a>
      </div>
      <div className="controls">
        <input
          className="query-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="$.store.book[*].author"
          aria-label="JSONPath expression"
          spellCheck={false}
        />
        <button className="btn btn--primary" onClick={run} disabled={!parsed.ok || busy}>
          {busy ? 'Loading…' : 'Run'}
        </button>
      </div>
      <div className="query-examples">
        {['$..*', '$.features[*]', '$..leaf', '$.count'].map((ex) => (
          <button key={ex} className="chip chip--sm" onClick={() => setQ(ex)}>
            {ex}
          </button>
        ))}
      </div>
      {err && <div className="status status--err">{err}</div>}
      {result ? (
        <Output value={result} copied={copied} onCopy={onCopy} filename="query-result.json" />
      ) : (
        <EmptyState text={parsed.ok ? '' : ' '} />
      )}
    </div>
  )
}

function ConvertPanel({
  text,
  setText,
  onCopy,
  copied,
}: {
  text: string
  setText: (v: string) => void
  onCopy: (v: string, l?: string) => void
  copied: string
}) {
  const [out, setOut] = useState('')
  const [err, setErr] = useState('')

  const toCsv = async () => {
    setErr('')
    const p = parseJson(text)
    if (!p.ok) return setErr('Input is not valid JSON')
    try {
      const { jsonToCsv } = await import('../lib/convert')
      setOut(jsonToCsv(p.value))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }
  const toJson = async () => {
    setErr('')
    try {
      const { csvToJson } = await import('../lib/convert')
      setOut(JSON.stringify(csvToJson(text), null, 2))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="pane">
      <div className="pane-head">
        <h2>JSON ↔ CSV</h2>
      </div>
      <div className="controls">
        <button className="btn btn--primary" onClick={toCsv}>
          JSON → CSV
        </button>
        <button className="btn" onClick={toJson}>
          CSV → JSON
        </button>
        {out && (
          <button className="btn" onClick={() => setText(out)}>
            ← Send to input
          </button>
        )}
      </div>
      <p className="hint">JSON→CSV needs a top-level array of objects. CSV→JSON reads row 1 as header.</p>
      {err && <div className="status status--err">{err}</div>}
      {out ? (
        <div className="output">
          <div className="output-actions">
            <button className="chip" onClick={() => onCopy(out, 'output')}>
              {copied === 'output' ? 'Copied!' : 'Copy'}
            </button>
            <button
              className="chip"
              onClick={() =>
                downloadBlob(
                  new Blob([out], { type: 'text/csv' }),
                  out.startsWith('[') || out.startsWith('{') ? 'converted.json' : 'converted.csv',
                )
              }
            >
              Download
            </button>
          </div>
          <pre className="output-pre">{out}</pre>
        </div>
      ) : (
        <EmptyState text=" " />
      )}
    </div>
  )
}

function DiffPanel({ left }: { left: string }) {
  const [right, setRight] = useState('')
  const [entries, setEntries] = useState<DiffEntry[] | null>(null)
  const [summary, setSummary] = useState<{ added: number; removed: number; changed: number } | null>(
    null,
  )
  const [err, setErr] = useState('')

  const run = async () => {
    setErr('')
    const l = parseJson(left)
    const r = parseJson(right)
    if (!l.ok) return setErr('Left (input) JSON is invalid')
    if (!r.ok) return setErr('Right JSON is invalid')
    const { diffJson, summarize } = await import('../lib/diff')
    const d = diffJson(l.value, r.value)
    setEntries(d)
    setSummary(summarize(d))
  }

  return (
    <div className="pane">
      <div className="pane-head">
        <h2>Diff two JSONs</h2>
      </div>
      <p className="hint">Left = the input editor. Paste the second JSON below.</p>
      <textarea
        className="editor editor--diff"
        spellCheck={false}
        value={right}
        onChange={(e) => setRight(e.target.value)}
        placeholder="Paste the second JSON here…"
        aria-label="Right JSON"
      />
      <div className="controls">
        <button className="btn btn--primary" onClick={run}>
          Compare
        </button>
      </div>
      {err && <div className="status status--err">{err}</div>}
      {summary && (
        <div className="diff-summary">
          <span className="pill pill--add">+{summary.added} added</span>
          <span className="pill pill--rem">−{summary.removed} removed</span>
          <span className="pill pill--chg">~{summary.changed} changed</span>
        </div>
      )}
      {entries && (
        <div className="diff-list">
          {entries.length === 0 ? (
            <div className="status status--ok">
              <span className="dot" /> Identical
            </div>
          ) : (
            entries.map((e, i) => (
              <div key={i} className={`diff-row diff-row--${e.kind}`}>
                <code className="diff-path">{e.path}</code>
                <span className="diff-detail">
                  {e.kind === 'add' && <ins>{JSON.stringify(e.right)}</ins>}
                  {e.kind === 'remove' && <del>{JSON.stringify(e.left)}</del>}
                  {e.kind === 'change' && (
                    <>
                      <del>{JSON.stringify(e.left)}</del> <span aria-hidden="true">→</span>{' '}
                      <ins>{JSON.stringify(e.right)}</ins>
                    </>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function AiPanel({
  parsed,
  text,
  setText,
}: {
  parsed: ReturnType<typeof parseJson>
  text: string
  setText: (v: string) => void
}) {
  const [mode, setMode] = useState<'explain' | 'generate' | 'schema'>('explain')
  const [prompt, setPrompt] = useState('')
  const [out, setOut] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const run = async () => {
    setBusy(true)
    setErr('')
    setOut('')
    try {
      const { complete } = await import('@chirag127/oz-ai')
      let system = ''
      let userPrompt = ''
      if (mode === 'explain') {
        if (!parsed.ok) throw new Error('Provide valid JSON in the input first')
        system = 'You explain JSON structure to developers. Be concise, use bullet points, name the top-level shape, key fields and their types. Plain text, no markdown fences.'
        userPrompt = `Explain this JSON:\n${text.slice(0, 6000)}`
      } else if (mode === 'schema') {
        if (!parsed.ok) throw new Error('Provide valid JSON in the input first')
        system = 'You output a JSON Schema (draft-07) for the given JSON. Return ONLY the schema as valid JSON, no prose, no code fences.'
        userPrompt = `Infer a JSON Schema for:\n${text.slice(0, 6000)}`
      } else {
        system = 'You generate realistic sample JSON from a description. Return ONLY valid JSON, no prose, no code fences.'
        userPrompt = prompt || 'a user profile with nested address and a list of orders'
      }
      const res = await complete(userPrompt, { system })
      const cleaned = res.replace(/^```(?:json)?\n?/i, '').replace(/```$/i, '').trim()
      setOut(cleaned)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const canSend = mode !== 'explain' && out && (out.trim().startsWith('{') || out.trim().startsWith('['))

  return (
    <div className="pane">
      <div className="pane-head">
        <h2>AI assist</h2>
        <span className="hint">optional · runs via g4f, no key</span>
      </div>
      <div className="ai-modes">
        {(['explain', 'schema', 'generate'] as const).map((m) => (
          <button
            key={m}
            className={`chip ${mode === m ? 'chip--on' : ''}`}
            onClick={() => setMode(m)}
          >
            {m === 'explain' ? 'Explain structure' : m === 'schema' ? 'Infer schema' : 'Generate sample'}
          </button>
        ))}
      </div>
      {mode === 'generate' && (
        <textarea
          className="editor editor--diff"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the JSON you want, e.g. 'a blog post with author, tags, comments'"
          aria-label="Description"
        />
      )}
      <div className="controls">
        <button className="btn btn--primary" onClick={run} disabled={busy}>
          {busy ? 'Thinking…' : 'Run AI'}
        </button>
        {canSend && (
          <button className="btn" onClick={() => setText(out)}>
            ← Send to input
          </button>
        )}
      </div>
      {err && <div className="status status--err">AI unavailable — {err}. Core tools still work.</div>}
      {out && <pre className="output-pre output-pre--ai">{out}</pre>}
      {!out && !busy && !err && (
        <div className="empty">AI is optional polish. All other tools work fully offline.</div>
      )}
    </div>
  )
}
