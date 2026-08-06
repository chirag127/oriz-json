import { useState, useMemo, useCallback } from 'react'

interface NodeProps {
  k: string | number | null
  value: unknown
  depth: number
  last: boolean
  defaultOpen: boolean
}

function typeOf(v: unknown): string {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v
}

function Leaf({ value }: { value: unknown }) {
  const t = typeOf(value)
  const cls =
    t === 'string'
      ? 'tk-string'
      : t === 'number'
        ? 'tk-number'
        : t === 'boolean'
          ? 'tk-bool'
          : 'tk-null'
  const text = t === 'string' ? `"${value}"` : String(value)
  return <span className={cls}>{text}</span>
}

function TreeNode({ k, value, depth, last, defaultOpen }: NodeProps) {
  const t = typeOf(value)
  const branch = t === 'object' || t === 'array'
  const [open, setOpen] = useState(depth < 2 ? true : defaultOpen)
  const entries = branch
    ? t === 'array'
      ? (value as unknown[]).map((v, i) => [i, v] as [number, unknown])
      : Object.entries(value as Record<string, unknown>)
    : []
  const count = entries.length
  const bracket = t === 'array' ? ['[', ']'] : ['{', '}']

  return (
    <div className="tree-node" data-last={last}>
      <div className="tree-row">
        <span className="tree-connector" aria-hidden="true" />
        {branch ? (
          <button
            className="tree-toggle"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            title={open ? 'Collapse' : 'Expand'}
          >
            <span className={`tree-caret ${open ? 'is-open' : ''}`} aria-hidden="true" />
          </button>
        ) : (
          <span className="tree-toggle tree-toggle--leaf" aria-hidden="true" />
        )}
        {k !== null && <span className="tree-key">{typeof k === 'number' ? k : `"${k}"`}</span>}
        {k !== null && <span className="tk-punct">: </span>}
        {branch ? (
          <span className="tree-bracket">
            <span className="tk-punct">{bracket[0]}</span>
            {!open && (
              <button className="tree-collapsed" onClick={() => setOpen(true)}>
                {count} {t === 'array' ? 'item' : 'key'}
                {count === 1 ? '' : 's'}
              </button>
            )}
            {!open && <span className="tk-punct">{bracket[1]}</span>}
          </span>
        ) : (
          <Leaf value={value} />
        )}
      </div>
      {branch && open && (
        <div className="tree-children">
          {entries.map(([ck, cv], i) => (
            <TreeNode
              key={String(ck)}
              k={ck}
              value={cv}
              depth={depth + 1}
              last={i === entries.length - 1}
              defaultOpen={defaultOpen}
            />
          ))}
          <div className="tree-row tree-row--close">
            <span className="tree-connector tree-connector--close" aria-hidden="true" />
            <span className="tree-toggle tree-toggle--leaf" aria-hidden="true" />
            <span className="tk-punct">{bracket[1]}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function JsonTree({ data }: { data: unknown }) {
  const [expandAll, setExpandAll] = useState(false)
  const [nonce, setNonce] = useState(0)
  const onExpand = useCallback((v: boolean) => {
    setExpandAll(v)
    setNonce((n) => n + 1)
  }, [])
  const root = useMemo(() => data, [data])
  return (
    <div className="tree">
      <div className="tree-controls">
        <button className="chip" onClick={() => onExpand(true)}>
          Expand all
        </button>
        <button className="chip" onClick={() => onExpand(false)}>
          Collapse all
        </button>
      </div>
      <div className="tree-body" key={nonce}>
        <TreeNode k={null} value={root} depth={0} last={true} defaultOpen={expandAll} />
      </div>
    </div>
  )
}
