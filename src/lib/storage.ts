// 端末内保存（IndexedDB）。サーバーなし。
import { createStore, entries, get, set, setMany, clear } from 'idb-keyval'
import bundled from '../data/book.json'
import { gc, normalizeBook, type Book } from './book'
import type { StudyRecord } from './records'

const kv = createStore('gomoku-joseki', 'kv')
const recStore = createStore('gomoku-joseki-records', 'records')

export interface Settings {
  showNumbers: boolean
  judge: 'main' | 'all'
  symmetric: boolean
  lastPractice?: { openingId: string; side: 'black' | 'white' }
}

export const defaultSettings: Settings = { showNumbers: true, judge: 'all', symmetric: false }

export const bundledBook = (): Book => normalizeBook(bundled)

export async function loadBook(): Promise<Book> {
  const saved = await get<Book>('book', kv)
  return saved ? normalizeBook(saved) : bundledBook()
}
export const saveBook = (b: Book) => set('book', gc(b), kv)

export async function loadSettings(): Promise<Settings> {
  return { ...defaultSettings, ...((await get<Settings>('settings', kv)) ?? {}) }
}
export const saveSettings = (s: Settings) => set('settings', s, kv)

export async function loadRecords(): Promise<Map<string, StudyRecord>> {
  const all = await entries<string, StudyRecord>(recStore)
  return new Map(all)
}
export const saveRecord = (r: StudyRecord) => setMany([[r.positionId, r]], recStore)
export const clearRecords = () => clear(recStore)
