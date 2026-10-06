// 定石データ（局面グラフ）の型と操作
import { parseCoord, toCoord, type Point } from './coord'
import { OPENINGS } from './openings'
import { boardFromMoves, play, type Board } from './rules'
import { applyT, canonicalize, invertT } from './symmetry'

export type Eval = 'black' | 'white' | 'even'
export const EVAL_LABEL: Record<Eval, string> = { black: '黒有利', white: '白有利', even: '互角' }

export interface MoveEdge {
  /** 正規形の座標系での着手点 */
  to: string
  /** 着手後の局面ID */
  next: string
  main?: boolean
  comment?: string
}

export interface BookNode {
  moves: MoveEdge[]
  eval?: Eval
  note?: string
}

export interface BookOpening {
  id: string
  name: string
  type: 'direct' | 'indirect'
  root: string
}

export interface Book {
  version: 1
  rule: 'renju'
  openings: BookOpening[]
  nodes: Record<string, BookNode>
}

/** 3手目までの局面IDを計算した珠型一覧 */
export const OPENING_ROOTS: BookOpening[] = OPENINGS.map((o) => ({
  id: o.id,
  name: o.name,
  type: o.type,
  root: canonicalize(boardFromMoves(o.moves.map(parseCoord))).id,
}))

export const emptyBook = (): Book => ({ version: 1, rule: 'renju', openings: OPENING_ROOTS, nodes: {} })

/** 読み込んだデータを現在の珠型定義で補正する */
export function normalizeBook(raw: unknown): Book {
  const b = raw as Partial<Book>
  if (!b || typeof b !== 'object' || b.rule !== 'renju' || typeof b.nodes !== 'object')
    throw new Error('定石データの形式が違います')
  return { version: 1, rule: 'renju', openings: OPENING_ROOTS, nodes: b.nodes ?? {} }
}

export interface Candidate {
  edge: MoveEdge
  /** 現在の表示盤での座標 */
  point: Point
}

/** 正解とみなす定石手（設定で主変化のみ／すべて） */
export function acceptable(cands: Candidate[], judge: 'main' | 'all'): Candidate[] {
  if (judge === 'all') return cands
  const main = cands.filter((c) => c.edge.main)
  return main.length ? main : cands
}

/** 表示中の盤における候補手（定石手）を返す */
export function candidates(book: Book, board: Board): Candidate[] {
  const { id, t } = canonicalize(board)
  const node = book.nodes[id]
  if (!node) return []
  return node.moves.map((edge) => ({ edge, point: invertT(t, parseCoord(edge.to)) }))
}

export const nodeOf = (book: Book, board: Board): BookNode | undefined => book.nodes[canonicalize(board).id]

/** 表示盤に p を打った後の局面ID（打てなければ null） */
export function nextIdAfter(board: Board, p: Point): string | null {
  const r = play(board, p)
  return r.ok ? canonicalize(r.board).id : null
}

/** 打った手が登録済みのどの定石手に当たるか（対称で同じ局面になる手も同一視） */
export function matchEdge(book: Book, board: Board, p: Point): MoveEdge | undefined {
  const nid = nextIdAfter(board, p)
  if (!nid) return undefined
  return nodeOf(book, board)?.moves.find((e) => e.next === nid)
}

/** 定石手を追加する（既にあれば何もしない）。新しい Book を返す。 */
export function addMove(book: Book, board: Board, p: Point): { book: Book; edge: MoveEdge } {
  const r = play(board, p)
  if (!r.ok) throw new Error(r.reason === 'occupied' ? 'そこには石があります' : '禁手です')
  const { id, t } = canonicalize(board)
  const next = canonicalize(r.board).id
  const node = book.nodes[id] ?? { moves: [] }
  const exist = node.moves.find((e) => e.next === next)
  if (exist) return { book, edge: exist }
  const edge: MoveEdge = { to: toCoord(applyT(t, p)), next, main: node.moves.length === 0 }
  const nodes = { ...book.nodes, [id]: { ...node, moves: [...node.moves, edge] } }
  if (!nodes[next]) nodes[next] = { moves: [] }
  return { book: { ...book, nodes }, edge }
}

export function updateEdge(book: Book, parentId: string, next: string, patch: Partial<MoveEdge>): Book {
  const node = book.nodes[parentId]
  if (!node) return book
  let moves = node.moves.map((e) => (e.next === next ? { ...e, ...patch } : e))
  if (patch.main) moves = moves.map((e) => (e.next === next ? e : { ...e, main: false }))
  return { ...book, nodes: { ...book.nodes, [parentId]: { ...node, moves } } }
}

export function updateNode(book: Book, id: string, patch: Partial<BookNode>): Book {
  const node = book.nodes[id] ?? { moves: [] }
  return { ...book, nodes: { ...book.nodes, [id]: { ...node, ...patch } } }
}

export function removeEdge(book: Book, parentId: string, next: string): Book {
  const node = book.nodes[parentId]
  if (!node) return book
  const moves = node.moves.filter((e) => e.next !== next)
  if (moves.length && !moves.some((e) => e.main)) moves[0] = { ...moves[0], main: true }
  return gc({ ...book, nodes: { ...book.nodes, [parentId]: { ...node, moves } } })
}

/** どの珠型からもたどれないノードを削除する */
export function gc(book: Book): Book {
  const keep = new Set<string>()
  const stack = book.openings.map((o) => o.root)
  while (stack.length) {
    const id = stack.pop()!
    if (keep.has(id)) continue
    keep.add(id)
    for (const e of book.nodes[id]?.moves ?? []) stack.push(e.next)
  }
  const nodes: Record<string, BookNode> = {}
  for (const [id, n] of Object.entries(book.nodes)) {
    // 中身のない葉は保存しない
    if (keep.has(id) && (n.moves.length || n.eval || n.note)) nodes[id] = n
  }
  return { ...book, nodes }
}

/** 各局面に入ってくる手の数（合流表示用） */
export function parentCounts(book: Book): Map<string, number> {
  const m = new Map<string, number>()
  for (const n of Object.values(book.nodes)) for (const e of n.moves) m.set(e.next, (m.get(e.next) ?? 0) + 1)
  return m
}

/** root からたどれる局面のうち、出題対象（次の定石手がある局面）の一覧 */
export function questionPositions(book: Book, root: string): string[] {
  const seen = new Set<string>()
  const res: string[] = []
  const stack = [root]
  while (stack.length) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    const n = book.nodes[id]
    if (n?.moves.length) {
      res.push(id)
      for (const e of n.moves) stack.push(e.next)
    }
  }
  return res
}

/** 局面IDから手番を求める（正規形文字列の石数から） */
export function sideOfId(id: string): 'black' | 'white' {
  const [b, w] = id.split('.')
  return b.length === w.length ? 'black' : 'white'
}
