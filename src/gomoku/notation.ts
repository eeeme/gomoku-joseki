// 表記：画面に出す手の書き方と、盤の向きをそろえる正規化
import { type Color, type Move, type Pos, PASS, FILES, moveToStr, strToMove, transformMove, colOf, rowOf } from './core'
import { OPENING_LINES } from './openings'

export const colorMark = (c: Color) => (c === 0 ? '●' : '○')
export const colorName = (c: Color) => (c === 0 ? '黒' : '白')

/** 「H8」 */
export function moveLabel(m: Move): string {
  return m === PASS ? 'パス' : moveToStr(m).toUpperCase()
}

/** 「● H8」「○ I9」 */
export function moveLabelWithColor(pos: Pos, m: Move): string {
  return `${colorMark(pos.turn)} ${moveLabel(m)}`
}

/** 手を表す文字列（保存形式 'h8'）から表示用ラベル */
export const labelOf = (s: string) => moveLabel(strToMove(s))

/** 棋譜文字列（h8i9j10… 大文字・空白・改行・区切り記号まじりでもよい）を手の列に分ける */
export function splitMoves(text: string): string[] {
  const t = text.toLowerCase()
  const out: string[] = []
  const re = /([a-o])(1[0-5]|[1-9])(?!\d)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) out.push(m[1] + m[2])
  return out
}

/** 手の列に変換をかける */
export function transformLine(moves: string[], k: number): string[] {
  if (!k) return moves
  return moves.map((s) => moveToStr(transformMove(strToMove(s), k)))
}

/** 盤の上のほう（行が大きい）→ 右のほう（列が大きい）を優先する並び */
const pref = (s: string) => {
  const m = strToMove(s)
  return rowOf(m) * 100 + colOf(m)
}

/**
 * 天元（h8）から始まる手順の向きをそろえる変換番号。
 * ・3手目までが26珠型のどれかなら、珠型の標準の向き（直接打ちは2手目 h9、間接打ちは2手目 i9）にそろえる
 * ・それ以外は、2手目から順に「なるべく上・右」に来る向きを選ぶ
 * h8 以外から始まる手順は変換しない（0）
 */
export function normalizerFor(moves: string[]): number {
  if (moves[0] !== 'h8' || moves.length < 2) return 0
  const lines = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => ({ k, l: transformLine(moves, k) }))
  const head = (l: string[]) => l.slice(0, 3).join('')
  if (moves.length >= 3) {
    const std = lines.find(({ l }) => OPENING_LINES.has(head(l)))
    if (std) return std.k
  }
  lines.sort((a, b) => {
    for (let i = 1; i < moves.length; i++) {
      const d = pref(b.l[i]) - pref(a.l[i])
      if (d) return d
    }
    return a.k - b.k
  })
  return lines[0].k
}

/** 天元からの手順を、標準の向きになるように盤ごと回す */
export function normalizeLine(moves: string[]): string[] {
  return transformLine(moves, normalizerFor(moves))
}

export { FILES }
