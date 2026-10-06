// 五目並べ（連珠）の最小コア：局面・着手・五連・黒の禁手（三三・四四・長連）・局面文字列・対称変換
export type Color = 0 | 1 // 0 = 黒（先手）, 1 = 白
export type Cell = 0 | 1 | 2 // 0 = 空, 1 = 黒, 2 = 白

export interface Pos {
  board: Cell[] // 225マス。a1=0, b1=1 … o1=14, a2=15 … o15=224
  turn: Color
}

/** 1手：0〜224 のマス。五目並べにパスは無いが、本のデータ形式を他の版とそろえるため定数だけ残す */
export type Move = number
export const PASS = -1

export const SIZE = 15
export const N = SIZE * SIZE
export const FILES = 'abcdefghijklmno'
export const colOf = (sq: number) => sq % SIZE // 0 = a
export const rowOf = (sq: number) => Math.floor(sq / SIZE) // 0 = 1行目
export const sqAt = (col: number, row: number) => row * SIZE + col
const inside = (x: number, y: number) => x >= 0 && x < SIZE && y >= 0 && y < SIZE

export const stoneOf = (c: Color): Cell => (c === 0 ? 1 : 2)
export const other = (c: Color): Color => (c === 0 ? 1 : 0)

/** 天元（h8） */
export const CENTER = sqAt(7, 7)

/** 局面文字列：225文字（'-' 空・'X' 黒・'O' 白）＋手番1文字 */
export const START_POS = '-'.repeat(N) + 'X'

export function parsePos(s: string): Pos {
  const t = s.trim()
  if (t.length !== N + 1 || !/^[-XO]+$/.test(t)) throw new Error('局面の文字列が正しくありません')
  const board = [...t.slice(0, N)].map((ch) => (ch === 'X' ? 1 : ch === 'O' ? 2 : 0)) as Cell[]
  return { board, turn: t[N] === 'X' ? 0 : 1 }
}

export function toPosString(pos: Pos): string {
  return pos.board.map((c) => (c === 1 ? 'X' : c === 2 ? 'O' : '-')).join('') + (pos.turn === 0 ? 'X' : 'O')
}

export const startPos = () => parsePos(START_POS)
export const clonePos = (p: Pos): Pos => ({ board: p.board.slice(), turn: p.turn })

// ---------- 五連・禁手 ----------

const DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [0, 1], [1, 1], [1, -1]]
type B = Uint8Array
const at = (b: B, x: number, y: number) => (inside(x, y) ? b[sqAt(x, y)] : 3) // 盤外は 3（壁）

/** (x,y) を通る d 方向の color の連続数（(x,y) を含む） */
function run(b: B, x: number, y: number, d: readonly [number, number], color: number): number {
  let n = 1
  for (let k = 1; at(b, x + d[0] * k, y + d[1] * k) === color; k++) n++
  for (let k = 1; at(b, x - d[0] * k, y - d[1] * k) === color; k++) n++
  return n
}

function fiveAt(b: B, x: number, y: number, color: number): boolean {
  for (const d of DIRS) {
    const n = run(b, x, y, d, color)
    if (color === 1 ? n === 5 : n >= 5) return true
  }
  return false
}

/** 黒石が (x,y) にある状態で、d 方向に「打てばちょうど五になる空点」（(x,y) を含む五だけ） */
function completions(b: B, x: number, y: number, d: readonly [number, number]): [number, number][] {
  const out: [number, number][] = []
  for (let k = -4; k <= 4; k++) {
    if (!k) continue
    const qx = x + d[0] * k
    const qy = y + d[1] * k
    if (at(b, qx, qy) !== 0) continue
    let ok = true
    const st = k > 0 ? 1 : -1
    for (let j = st; j !== k; j += st) if (at(b, x + d[0] * j, y + d[1] * j) !== 1) { ok = false; break }
    if (!ok) continue
    b[sqAt(qx, qy)] = 1
    const n = run(b, qx, qy, d, 1)
    b[sqAt(qx, qy)] = 0
    if (n === 5) out.push([qx, qy])
  }
  return out
}

const span = (a: [number, number], c: [number, number]) => Math.max(Math.abs(a[0] - c[0]), Math.abs(a[1] - c[1]))

/** d 方向の四の数（達四 _XXXX_ は1つ、X.XXX.X のような一直線の四四は2つ） */
function fours(b: B, x: number, y: number, d: readonly [number, number]): number {
  const c = completions(b, x, y, d)
  if (c.length <= 1) return c.length
  return span(c[0], c[1]) === 5 ? 1 : 2
}

const straightFour = (b: B, x: number, y: number, d: readonly [number, number]) => {
  const c = completions(b, x, y, d)
  return c.length === 2 && span(c[0], c[1]) === 5
}

/** d 方向が「本物の三」（禁手でない点に打って達四にできる）か */
function realThree(b: B, x: number, y: number, d: readonly [number, number], depth: number): boolean {
  for (let k = -4; k <= 4; k++) {
    if (!k) continue
    const qx = x + d[0] * k
    const qy = y + d[1] * k
    if (at(b, qx, qy) !== 0) continue
    b[sqAt(qx, qy)] = 1
    const s = straightFour(b, x, y, d)
    b[sqAt(qx, qy)] = 0
    if (s && !foulRaw(b, qx, qy, depth + 1)) return true
  }
  return false
}

export type Foul = '三三' | '四四' | '長連'

function foulRaw(b: B, x: number, y: number, depth: number): Foul | null {
  if (at(b, x, y) !== 0) return null
  b[sqAt(x, y)] = 1
  try {
    if (fiveAt(b, x, y, 1)) return null // 五連は禁手より優先
    if (DIRS.some((d) => run(b, x, y, d, 1) >= 6)) return '長連'
    let f = 0
    for (const d of DIRS) f += fours(b, x, y, d)
    if (f >= 2) return '四四'
    if (depth > 6) return null
    let t = 0
    for (const d of DIRS) {
      if (fours(b, x, y, d)) continue
      if (realThree(b, x, y, d, depth) && ++t >= 2) return '三三'
    }
    return null
  } finally {
    b[sqAt(x, y)] = 0
  }
}

const raw = (pos: Pos): B => Uint8Array.from(pos.board)

/** 黒が sq に打つと禁手になるならその種類 */
export function foulAt(pos: Pos, sq: number): Foul | null {
  return foulRaw(raw(pos), colOf(sq), rowOf(sq), 0)
}

/** 黒番の禁手点（石の近くだけ調べる）。白番なら空 */
export function forbiddenPoints(pos: Pos): number[] {
  if (pos.turn !== 0 || isOver(pos)) return []
  const b = raw(pos)
  const near = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    if (b[i] !== 1) continue
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) if (inside(colOf(i) + dx, rowOf(i) + dy)) near[sqAt(colOf(i) + dx, rowOf(i) + dy)] = 1
  }
  const out: number[] = []
  for (let i = 0; i < N; i++) if (near[i] && !b[i] && foulRaw(b, colOf(i), rowOf(i), 0)) out.push(i)
  return out
}

/** 五連ができていれば勝った側（0=黒 / 1=白）。黒は長連を五連と数えない */
export function fiveWinner(pos: Pos): Color | null {
  const b = raw(pos)
  for (let i = 0; i < N; i++) {
    const c = b[i]
    if (!c) continue
    const x = colOf(i)
    const y = rowOf(i)
    for (const d of DIRS) {
      // 連の先頭からだけ数える
      if (at(b, x - d[0], y - d[1]) === c) continue
      const n = run(b, x, y, d, c)
      if (c === 1 ? n === 5 : n >= 5) return c === 1 ? 0 : 1
    }
  }
  return null
}

/** 五目並べにパスは無い */
export const mustPass = (_pos: Pos) => false
/** 五連ができた、または盤が埋まった */
export const isOver = (pos: Pos) => fiveWinner(pos) !== null || pos.board.every((c) => c !== 0)

/** 空いている点（終局していれば空）。禁手点は含めない */
export function legalMoves(pos: Pos): number[] {
  if (isOver(pos)) return []
  const ban = new Set(forbiddenPoints(pos))
  const out: number[] = []
  for (let i = 0; i < N; i++) if (!pos.board[i] && !ban.has(i)) out.push(i)
  return out
}

/** 打てない理由（打てるなら null） */
export function illegalReason(pos: Pos, m: Move): string | null {
  if (m === PASS) return 'パスはできません'
  if (m < 0 || m >= N) return '盤の外です'
  if (pos.board[m]) return 'そこには石があります'
  if (isOver(pos)) return 'もう終局しています'
  // 連珠のルール：1手目は天元（h8）
  if (m !== CENTER && pos.board.every((c) => c === 0)) return '1手目は天元（H8）です'
  if (pos.turn === 0) {
    const f = foulAt(pos, m)
    if (f) return `禁手（${f}）です`
  }
  return null
}

export const isLegal = (pos: Pos, m: Move) => illegalReason(pos, m) === null

export function applyMove(pos: Pos, m: Move): Pos {
  const why = illegalReason(pos, m)
  if (why) throw new Error(why)
  const n = clonePos(pos)
  n.board[m] = stoneOf(pos.turn)
  n.turn = other(pos.turn)
  return n
}

export function countStones(pos: Pos): { black: number; white: number } {
  let black = 0
  let white = 0
  for (const c of pos.board) {
    if (c === 1) black++
    else if (c === 2) white++
  }
  return { black, white }
}

// ---------- 座標表記 ----------
export function moveToStr(m: Move): string {
  if (m === PASS) return 'pass'
  return FILES[colOf(m)] + (rowOf(m) + 1)
}

export function strToMove(s: string): Move {
  const t = s.trim().toLowerCase()
  if (t === 'pass') return PASS
  const m = /^([a-o])(1[0-5]|[1-9])$/.exec(t)
  if (!m) throw new Error(`手の表記が正しくありません: ${s}`)
  return sqAt(m[1].charCodeAt(0) - 97, Number(m[2]) - 1)
}

// ---------- 対称変換（8通り。どれも天元 h8 を動かさない） ----------
/** k = 0〜7。マス → 変換後のマス */
export function transformSq(sq: number, k: number): number {
  let x = colOf(sq)
  let y = rowOf(sq)
  if (k & 4) [x, y] = [y, x] // 主対角線（a1-o15）で反転
  if (k & 1) x = SIZE - 1 - x // 左右反転
  if (k & 2) y = SIZE - 1 - y // 上下反転
  return sqAt(x, y)
}

export function transformMove(m: Move, k: number): Move {
  return m === PASS ? PASS : transformSq(m, k)
}

export function transformPos(pos: Pos, k: number): Pos {
  const board = new Array<Cell>(N)
  for (let i = 0; i < N; i++) board[transformSq(i, k)] = pos.board[i]
  return { board, turn: pos.turn }
}

/** 8つの対称形のうち文字列が一番小さいもの（向きの違う同じ局面を同一視するキー） */
export function canonicalKey(pos: Pos): string {
  let best = ''
  for (let k = 0; k < 8; k++) {
    const s = toPosString(transformPos(pos, k))
    if (!best || s < best) best = s
  }
  return best
}

export const isStartPos = (s: string) => s === START_POS
