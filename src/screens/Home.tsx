import { openingById } from '../lib/openings'
import { reviewQueue } from '../lib/records'
import { useApp } from '../state'

export default function Home() {
  const { go, records, settings, book } = useApp()
  const due = reviewQueue([...records.values()]).filter((r) => book.nodes[r.positionId]).length
  const last = settings.lastPractice
  const lastOp = last && openingById(last.openingId)

  return (
    <main className="home">
      <div className="home-title">
        <div className="logo" aria-hidden>
          <span className="s b" />
          <span className="s w" />
          <span className="s b" />
        </div>
        <h1>五目定石帳</h1>
        <p className="muted">連珠・26珠型</p>
      </div>

      <nav className="home-menu">
        {last && lastOp && (
          <button className="btn primary big" onClick={() => go({ name: 'practice', ...last })}>
            練習を続ける
            <small>
              {lastOp.name}・{last.side === 'black' ? '黒番' : '白番'}
            </small>
          </button>
        )}
        <button className="btn big" onClick={() => go({ name: 'review' })} disabled={!due}>
          復習
          {due > 0 && <span className="badge">{due}</span>}
        </button>
        <button className={`btn big ${last ? '' : 'primary'}`} onClick={() => go({ name: 'list' })}>
          珠型一覧
        </button>
      </nav>

      <button className="settings-link" onClick={() => go({ name: 'settings' })}>
        設定
      </button>
      <footer className="credit">ME IS ME</footer>
    </main>
  )
}
