import { useEffect, useState, type ReactNode } from 'react'
import { useApp, type Screen } from '../state'

export function Header({ title, sub, back = { name: 'home' }, right }: {
  title: string
  sub?: string
  back?: Screen | null
  right?: ReactNode
}) {
  const { go } = useApp()
  return (
    <header className="hdr">
      {back ? (
        <button className="icon-btn" onClick={() => go(back)} aria-label="戻る">
          ←
        </button>
      ) : (
        <span className="icon-btn" />
      )}
      <div className="hdr-title">
        <h1>{title}</h1>
        {sub && <small>{sub}</small>}
      </div>
      <div className="hdr-right">{right}</div>
    </header>
  )
}

/** 珠型名を3手目確定時に表示するバナー */
export function Banner({ text, kana }: { text: string; kana?: string }) {
  const [show, setShow] = useState(true)
  useEffect(() => {
    const t = window.setTimeout(() => setShow(false), 1600)
    return () => window.clearTimeout(t)
  }, [])
  if (!show) return null
  return (
    <div className="banner" onClick={() => setShow(false)}>
      <div className="banner-name">{text}</div>
      {kana && <div className="banner-kana">{kana}</div>}
    </div>
  )
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
