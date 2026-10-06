import { useRef, useState } from 'react'
import { Header } from '../components/ui'
import { gc, normalizeBook } from '../lib/book'
import { bundledBook } from '../lib/storage'
import { validateBook } from '../lib/validate'
import { useApp } from '../state'

export default function Settings() {
  const { settings, setSettings, book, setBook, resetRecords, toast } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [check, setCheck] = useState<string | null>(null)
  const nodeCount = Object.keys(book.nodes).length

  const exportBook = () => {
    const issues = validateBook(book)
    setCheck(issues.length ? `検証：${issues.length}件の問題（${issues[0].message}）` : '検証：問題なし')
    const blob = new Blob([JSON.stringify(gc(book), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'book.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importBook = async (f: File) => {
    try {
      const b = normalizeBook(JSON.parse(await f.text()))
      const issues = validateBook(b)
      if (issues.length && !window.confirm(`${issues.length}件の問題があります。読み込みますか？`)) return
      setBook(b)
      toast('読み込みました')
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <main>
      <Header title="設定" />
      <section className="panel settings">
        <label className="toggle">
          <span>手数を表示</span>
          <input
            type="checkbox"
            checked={settings.showNumbers}
            onChange={(e) => setSettings({ ...settings, showNumbers: e.target.checked })}
          />
        </label>
        <label className="toggle">
          <span>復習を対称形（回転・反転）で出題</span>
          <input
            type="checkbox"
            checked={settings.symmetric}
            onChange={(e) => setSettings({ ...settings, symmetric: e.target.checked })}
          />
        </label>
        <div className="field">
          <span>正解にする手</span>
          <div className="seg">
            <button className={settings.judge === 'all' ? 'on' : ''} onClick={() => setSettings({ ...settings, judge: 'all' })}>
              すべての定石手
            </button>
            <button className={settings.judge === 'main' ? 'on' : ''} onClick={() => setSettings({ ...settings, judge: 'main' })}>
              主変化のみ
            </button>
          </div>
        </div>
      </section>

      <section className="panel settings">
        <h2>定石データ</h2>
        <p className="muted small">登録局面 {nodeCount}</p>
        <button className="btn" onClick={exportBook}>
          書き出す（book.json）
        </button>
        {check && <p className="small">{check}</p>}
        <button className="btn" onClick={() => fileRef.current?.click()}>
          読み込む
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importBook(f)
            e.target.value = ''
          }}
        />
        <button
          className="btn danger"
          onClick={() => {
            if (window.confirm('編集した定石データを消して、同梱データに戻しますか？')) setBook(bundledBook())
          }}
        >
          同梱データに戻す
        </button>
      </section>

      <section className="panel settings">
        <h2>学習記録</h2>
        <button
          className="btn danger"
          onClick={async () => {
            if (window.confirm('練習・復習の記録をすべて消しますか？')) {
              await resetRecords()
              toast('記録を消しました')
            }
          }}
        >
          記録をリセット
        </button>
      </section>
      <footer className="credit">五目定石帳 v{__APP_VERSION__}　ME IS ME</footer>
    </main>
  )
}
