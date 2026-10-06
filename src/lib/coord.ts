// 盤座標ユーティリティ
// 横 a〜o（x: 0〜14）、縦 1〜15（y: 0〜14、下が1）。連珠の棋譜表記に合わせる。

export const SIZE = 15
export const CENTER = 7
export const COLS = 'abcdefghijklmno'

export type Stone = 0 | 1 | 2 // 0: 空, 1: 黒, 2: 白
export const EMPTY = 0 as const
export const BLACK = 1 as const
export const WHITE = 2 as const

export interface Point {
  x: number
  y: number
}

export const idx = (x: number, y: number) => y * SIZE + x
export const pointOf = (i: number): Point => ({ x: i % SIZE, y: Math.floor(i / SIZE) })
export const inside = (x: number, y: number) => x >= 0 && x < SIZE && y >= 0 && y < SIZE

export function toCoord(p: Point): string {
  return `${COLS[p.x]}${p.y + 1}`
}

export function parseCoord(s: string): Point {
  const m = /^([a-o])(\d{1,2})$/.exec(s.trim().toLowerCase())
  if (!m) throw new Error(`座標が不正です: ${s}`)
  const x = COLS.indexOf(m[1])
  const y = Number(m[2]) - 1
  if (!inside(x, y)) throw new Error(`盤外の座標です: ${s}`)
  return { x, y }
}

export const samePoint = (a: Point | null | undefined, b: Point | null | undefined) =>
  !!a && !!b && a.x === b.x && a.y === b.y
