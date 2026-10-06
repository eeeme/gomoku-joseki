// 8通りの対称変換（回転4 × 反転2）と局面キーの正規化
import { BLACK, SIZE, WHITE, idx, type Point } from './coord'
import type { Board } from './rules'

const N = SIZE - 1

/** 変換番号 0〜7。0 は恒等変換。 */
export const TRANSFORMS: ReadonlyArray<(p: Point) => Point> = [
  (p) => ({ x: p.x, y: p.y }),
  (p) => ({ x: N - p.y, y: p.x }), // 90°
  (p) => ({ x: N - p.x, y: N - p.y }), // 180°
  (p) => ({ x: p.y, y: N - p.x }), // 270°
  (p) => ({ x: N - p.x, y: p.y }), // 左右反転
  (p) => ({ x: p.y, y: p.x }), // 対角反転
  (p) => ({ x: p.x, y: N - p.y }), // 上下反転
  (p) => ({ x: N - p.y, y: N - p.x }), // 反対角反転
]

/** INVERSE[t] は t の逆変換の番号 */
export const INVERSE: number[] = TRANSFORMS.map((f) => {
  const probe = { x: 2, y: 5 }
  const fp = f(probe)
  return TRANSFORMS.findIndex((g) => {
    const q = g(fp)
    return q.x === probe.x && q.y === probe.y
  })
})

export const applyT = (t: number, p: Point): Point => TRANSFORMS[t](p)
export const invertT = (t: number, p: Point): Point => TRANSFORMS[INVERSE[t]](p)

export function transformBoard(b: Board, t: number): Board {
  const nb = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) {
    if (!b[i]) continue
    const q = TRANSFORMS[t]({ x: i % SIZE, y: Math.floor(i / SIZE) })
    nb[idx(q.x, q.y)] = b[i]
  }
  return nb
}

const enc = (n: number) => n.toString(36).padStart(2, '0')

function keyOf(b: Board, t: number): string {
  const blacks: number[] = []
  const whites: number[] = []
  for (let i = 0; i < b.length; i++) {
    if (!b[i]) continue
    const q = TRANSFORMS[t]({ x: i % SIZE, y: Math.floor(i / SIZE) })
    const j = idx(q.x, q.y)
    if (b[i] === BLACK) blacks.push(j)
    else if (b[i] === WHITE) whites.push(j)
  }
  blacks.sort((a, c) => a - c)
  whites.sort((a, c) => a - c)
  return `${blacks.map(enc).join('')}.${whites.map(enc).join('')}`
}

export interface Canonical {
  /** 正規化済み局面ID（8通りのうち辞書順最小の (黒,白) 表現） */
  id: string
  /** 実際の盤 → 正規形 の変換番号 */
  t: number
}

/**
 * 局面を正規化する。手番は石数から決まるのでキーに含めない。
 * ID はハッシュせず正規形の文字列そのもの（衝突なし・デバッグしやすい）。
 */
export function canonicalize(b: Board): Canonical {
  let best = keyOf(b, 0)
  let bestT = 0
  for (let t = 1; t < 8; t++) {
    const k = keyOf(b, t)
    if (k < best) {
      best = k
      bestT = t
    }
  }
  return { id: best, t: bestT }
}
