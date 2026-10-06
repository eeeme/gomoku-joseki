import { useMemo, useState } from 'react'
import { MiniBoard } from '../components/Board'
import { Header, pct } from '../components/ui'
import { parseCoord } from '../lib/coord'
import { OPENING_ROOTS, questionPositions } from '../lib/book'
import { OPENINGS, type OpeningDef, type OpeningType } from '../lib/openings'
import { isMastered } from '../lib/records'
import { useApp } from '../state'

export default function OpeningList() {
  const { book, records, go, settings, setSettings } = useApp()
  const [tab, setTab] = useState<OpeningType>(() => {
    const id = settings.lastPractice?.openingId
    return id?.startsWith('I') ? 'indirect' : 'direct'
  })
  const [sel, setSel] = useState<OpeningDef | null>(null)

  const stats = useMemo(() => {
    const m = new Map<string, { total: number; done: number }>()
    for (const o of OPENING_ROOTS) {
      const qs = questionPositions(book, o.root)
      m.set(o.id, { total: qs.length, done: qs.filter((id) => isMastered(records.get(id))).length })
    }
    return m
  }, [book, records])

  const list = OPENINGS.filter((o) => o.type === tab)
  const sum = list.reduce(
    (a, o) => ({ total: a.total + stats.get(o.id)!.total, done: a.done + stats.get(o.id)!.done }),
    { total: 0, done: 0 },
  )

  const practice = (o: OpeningDef, side: 'black' | 'white') => {
    setSettings({ ...settings, lastPractice: { openingId: o.id, side } })
    go({ name: 'practice', openingId: o.id, side })
  }

  return (
    <main>
      <Header title="珠型一覧" />
      <div className="tabs" role="tablist">
        {(['direct', 'indirect'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t === 'direct' ? '直接打ち' : '間接打ち'}
          </button>
        ))}
      </div>
      <div className="tab-summary muted">
        習得 {sum.done}/{sum.total}（{pct(sum.done, sum.total)}%）
      </div>

      <ul className="op-grid">
        {list.map((o) => {
          const s = stats.get(o.id)!
          return (
            <li key={o.id}>
              <button className="op-card" onClick={() => setSel(o)}>
                <MiniBoard moves={o.moves.map(parseCoord)} />
                <div className="op-name">{o.name}</div>
                <div className="op-kana">{o.kana}</div>
                <div className="meter">
                  <span style={{ width: `${pct(s.done, s.total)}%` }} />
                </div>
                <div className="op-count muted">{s.total ? `${s.done}/${s.total}` : '未登録'}</div>
              </button>
            </li>
          )
        })}
      </ul>

      {sel && (
        <div className="sheet-backdrop" onClick={() => setSel(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <MiniBoard moves={sel.moves.map(parseCoord)} />
              <div>
                <div className="op-name big">{sel.name}</div>
                <div className="op-kana">
                  {sel.kana}・{sel.type === 'direct' ? '直接' : '間接'}
                  {sel.no}
                </div>
              </div>
            </div>
            <button className="btn" onClick={() => go({ name: 'browse', openingId: sel.id })}>
              閲覧
            </button>
            <div className="row2">
              <button className="btn primary" onClick={() => practice(sel, 'black')} disabled={!stats.get(sel.id)!.total}>
                黒で練習
              </button>
              <button className="btn primary" onClick={() => practice(sel, 'white')} disabled={!stats.get(sel.id)!.total}>
                白で練習
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
