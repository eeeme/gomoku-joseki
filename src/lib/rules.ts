// 連珠ルールエンジン：着手、五連判定、黒の禁手（三三・四四・長連）判定
import { BLACK, EMPTY, SIZE, WHITE, idx, inside, type Point, type Stone } from './coord'

export type Board = Uint8Array // 長さ225。0:空 1:黒 2:白

export const newBoard = (): Board => new Uint8Array(SIZE * SIZE)
export const get = (b: Board, x: number, y: number): Stone =>
  inside(x, y) ? (b[idx(x, y)] as Stone) : (3 as unknown as Stone) // 盤外は3（どちらの石でもない壁）

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
]

/** 石数から手番を決める（黒番が先）。 */
export function sideToMove(b: Board): 1 | 2 {
  let black = 0
  let white = 0
  for (const s of b) {
    if (s === BLACK) black++
    else if (s === WHITE) white++
  }
  return black === white ? BLACK : WHITE
}

/** p を通る dir 方向の color の連続数（p 自身を含む。p に石が置かれている前提）。 */
function runLength(b: Board, p: Point, d: readonly [number, number], color: Stone): number {
  let n = 1
  for (let k = 1; get(b, p.x + d[0] * k, p.y + d[1] * k) === color; k++) n++
  for (let k = 1; get(b, p.x - d[0] * k, p.y - d[1] * k) === color; k++) n++
  return n
}

/** p に置かれた石が五連（白は五以上、黒はちょうど五）を作っているか。 */
export function makesFive(b: Board, p: Point, color: Stone): boolean {
  for (const d of DIRS) {
    const n = runLength(b, p, d, color)
    if (color === BLACK ? n === 5 : n >= 5) return true
  }
  return false
}

function hasOverline(b: Board, p: Point): boolean {
  return DIRS.some((d) => runLength(b, p, d, BLACK) >= 6)
}

/**
 * 黒石が p にある状態で、d 方向について「置けばちょうど五連になる空点」を列挙する。
 * 返す点は p を含む五連を完成させるものだけ。
 */
function fiveCompletions(b: Board, p: Point, d: readonly [number, number]): Point[] {
  const res: Point[] = []
  for (let k = -4; k <= 4; k++) {
    if (k === 0) continue
    const q = { x: p.x + d[0] * k, y: p.y + d[1] * k }
    if (get(b, q.x, q.y) !== EMPTY) continue
    // q と p の間がすべて黒でないと、q を置いても p を含む連にならない
    let connected = true
    const step = k > 0 ? 1 : -1
    for (let j = step; j !== k; j += step) {
      if (get(b, p.x + d[0] * j, p.y + d[1] * j) !== BLACK) {
        connected = false
        break
      }
    }
    if (!connected) continue
    b[idx(q.x, q.y)] = BLACK
    const n = runLength(b, q, d, BLACK)
    b[idx(q.x, q.y)] = EMPTY
    if (n === 5) res.push(q)
  }
  return res
}

/** d 方向の四の数（0〜2）。達四（_XXXX_）は1つと数える。 */
function foursInDir(b: Board, p: Point, d: readonly [number, number]): number {
  const comps = fiveCompletions(b, p, d)
  if (comps.length <= 1) return comps.length
  // 2点ある場合：両端の間が黒4つで連続していれば達四（1つの四）
  const [a, c] = comps
  const dist = Math.max(Math.abs(a.x - c.x), Math.abs(a.y - c.y))
  return dist === 5 ? 1 : 2
}

/** d 方向が達四（両端どちらでも五になる四）になっているか。 */
function isStraightFour(b: Board, p: Point, d: readonly [number, number]): boolean {
  const comps = fiveCompletions(b, p, d)
  if (comps.length !== 2) return false
  const [a, c] = comps
  return Math.max(Math.abs(a.x - c.x), Math.abs(a.y - c.y)) === 5
}

/** d 方向が「本物の三」（禁手でない点に打って達四にできる）か。 */
function isRealThree(b: Board, p: Point, d: readonly [number, number], depth: number): boolean {
  for (let k = -4; k <= 4; k++) {
    if (k === 0) continue
    const q = { x: p.x + d[0] * k, y: p.y + d[1] * k }
    if (get(b, q.x, q.y) !== EMPTY) continue
    b[idx(q.x, q.y)] = BLACK
    const straight = isStraightFour(b, p, d) && runLength(b, q, d, BLACK) <= 4
    b[idx(q.x, q.y)] = EMPTY
    if (straight && !isForbiddenAt(b, q, depth + 1)) return true
  }
  return false
}

export type Foul = 'double-three' | 'double-four' | 'overline'

/** 内部用：深さ付きの禁手判定（盤は一時的に変更して必ず元に戻す） */
function foulAt(b: Board, p: Point, depth: number): Foul | null {
  if (get(b, p.x, p.y) !== EMPTY) return null
  b[idx(p.x, p.y)] = BLACK
  try {
    if (makesFive(b, p, BLACK)) return null // 五連は禁手より優先
    if (hasOverline(b, p)) return 'overline'
    let fours = 0
    for (const d of DIRS) fours += foursInDir(b, p, d)
    if (fours >= 2) return 'double-four'
    if (depth > 6) return null // 念のための再帰上限
    let threes = 0
    for (const d of DIRS) {
      if (foursInDir(b, p, d) > 0) continue // 四になっている方向は三と数えない
      if (isRealThree(b, p, d, depth)) threes++
      if (threes >= 2) return 'double-three'
    }
    return null
  } finally {
    b[idx(p.x, p.y)] = EMPTY
  }
}

function isForbiddenAt(b: Board, p: Point, depth: number): boolean {
  return foulAt(b, p, depth) !== null
}

/** 黒が p に打つと禁手になるならその種類を返す。 */
export function foulOf(b: Board, p: Point): Foul | null {
  return foulAt(b, p, 0)
}

export const FOUL_LABEL: Record<Foul, string> = {
  'double-three': '三三',
  'double-four': '四四',
  overline: '長連',
}

/** 盤上のすべての黒の禁手点（石の近くだけ調べる） */
export function forbiddenPoints(b: Board): Point[] {
  const res: Point[] = []
  const near = new Uint8Array(SIZE * SIZE)
  for (let i = 0; i < b.length; i++) {
    if (b[i] !== BLACK) continue
    const x = i % SIZE
    const y = Math.floor(i / SIZE)
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) if (inside(x + dx, y + dy)) near[idx(x + dx, y + dy)] = 1
  }
  for (let i = 0; i < b.length; i++) {
    if (!near[i] || b[i] !== EMPTY) continue
    const p = { x: i % SIZE, y: Math.floor(i / SIZE) }
    if (foulOf(b, p)) res.push(p)
  }
  return res
}

export type PlayResult =
  | { ok: true; board: Board; win: boolean }
  | { ok: false; reason: 'occupied' | Foul }

/** 手番の石を p に置く（元の盤は変更しない） */
export function play(b: Board, p: Point): PlayResult {
  if (get(b, p.x, p.y) !== EMPTY) return { ok: false, reason: 'occupied' }
  const color = sideToMove(b)
  if (color === BLACK) {
    const foul = foulOf(b, p)
    if (foul) return { ok: false, reason: foul }
  }
  const nb = b.slice()
  nb[idx(p.x, p.y)] = color
  return { ok: true, board: nb, win: makesFive(nb, p, color) }
}

/** 手順（座標列）から盤を作る。禁手・重複があれば例外。 */
export function boardFromMoves(moves: Point[]): Board {
  let b = newBoard()
  for (const m of moves) {
    const r = play(b, m)
    if (!r.ok) throw new Error(`着手できません (${m.x},${m.y}): ${r.reason}`)
    b = r.board
  }
  return b
}
