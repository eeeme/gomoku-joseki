import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { idx, type Point } from './lib/coord'
import type { Book } from './lib/book'
import type { StudyRecord } from './lib/records'
import { boardFromMoves, forbiddenPoints, sideToMove, type Board } from './lib/rules'
import * as store from './lib/storage'

export type Screen =
  | { name: 'home' }
  | { name: 'list' }
  | { name: 'browse'; openingId: string }
  | { name: 'practice'; openingId: string; side: 'black' | 'white' }
  | { name: 'review' }
  | { name: 'settings' }

interface AppState {
  book: Book
  setBook: (b: Book) => void
  records: Map<string, StudyRecord>
  putRecord: (r: StudyRecord) => void
  resetRecords: () => Promise<void>
  settings: store.Settings
  setSettings: (s: store.Settings) => void
  screen: Screen
  go: (s: Screen) => void
  toast: (msg: string) => void
}

const Ctx = createContext<AppState | null>(null)
export const useApp = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('AppProvider がありません')
  return c
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [book, setBookState] = useState<Book | null>(null)
  const [records, setRecords] = useState<Map<string, StudyRecord>>(new Map())
  const [settings, setSettingsState] = useState<store.Settings>(store.defaultSettings)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([store.loadBook(), store.loadRecords(), store.loadSettings()]).then(([b, r, s]) => {
      setBookState(b)
      setRecords(r)
      setSettingsState(s)
    })
  }, [])

  const setBook = useCallback((b: Book) => {
    setBookState(b)
    store.saveBook(b)
  }, [])
  const putRecord = useCallback((r: StudyRecord) => {
    setRecords((m) => new Map(m).set(r.positionId, r))
    store.saveRecord(r)
  }, [])
  const resetRecords = useCallback(async () => {
    await store.clearRecords()
    setRecords(new Map())
  }, [])
  const setSettings = useCallback((s: store.Settings) => {
    setSettingsState(s)
    store.saveSettings(s)
  }, [])
  const go = useCallback((s: Screen) => {
    setScreen(s)
    window.scrollTo(0, 0)
  }, [])
  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 1800)
  }, [])

  const value = useMemo(
    () =>
      book && { book, setBook, records, putRecord, resetRecords, settings, setSettings, screen, go, toast },
    [book, setBook, records, putRecord, resetRecords, settings, setSettings, screen, go, toast],
  )
  if (!value) return <div className="loading">…</div>
  return (
    <Ctx.Provider value={value}>
      {children}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </Ctx.Provider>
  )
}

/** 手順から盤・手数・最終手・禁手点をまとめて計算する */
export function usePosition(moves: Point[]) {
  return useMemo(() => {
    const board: Board = boardFromMoves(moves)
    const numbers = new Map<number, number>()
    moves.forEach((m, i) => numbers.set(idx(m.x, m.y), i + 1))
    const black = sideToMove(board) === 1
    return {
      board,
      numbers,
      last: moves.length ? moves[moves.length - 1] : null,
      forbidden: black ? forbiddenPoints(board) : [],
      turn: black ? ('black' as const) : ('white' as const),
    }
  }, [moves])
}
