import { describe, expect, it } from 'vitest'
import bundled from '../data/book.json'
import { parseCoord, toCoord } from './coord'
import {
  OPENING_ROOTS,
  addMove,
  candidates,
  emptyBook,
  matchEdge,
  normalizeBook,
  parentCounts,
  questionPositions,
  removeEdge,
} from './book'
import { OPENINGS } from './openings'
import { boardFromMoves } from './rules'
import { TRANSFORMS, canonicalize, transformBoard } from './symmetry'
import { validateBook } from './validate'

const board = (...cs: string[]) => boardFromMoves(cs.map(parseCoord))

describe('対称性と正規化', () => {
  it('8通りの変換で同じ局面IDになる', () => {
    const b = board('h8', 'i9', 'i7', 'j8')
    const id = canonicalize(b).id
    for (let t = 0; t < 8; t++) expect(canonicalize(transformBoard(b, t)).id).toBe(id)
  })
  it('変換は8通りすべて異なる', () => {
    const p = { x: 2, y: 5 }
    const s = new Set(TRANSFORMS.map((f) => toCoord(f(p))))
    expect(s.size).toBe(8)
  })
  it('26珠型はすべて別の局面', () => {
    expect(OPENINGS).toHaveLength(26)
    expect(new Set(OPENING_ROOTS.map((o) => o.root)).size).toBe(26)
    expect(OPENINGS.filter((o) => o.type === 'direct')).toHaveLength(13)
  })
  it('手順前後で同じ局面に合流する', () => {
    const a = board('h8', 'h9', 'i9', 'j10', 'g7')
    const b = board('h8', 'h9', 'g7', 'j10', 'i9')
    expect(canonicalize(a).id).toBe(canonicalize(b).id)
  })
})

describe('定石グラフ', () => {
  it('追加した手は対称形の盤でも正しい位置に出る', () => {
    const b = board('h8', 'h9', 'i9') // 花月
    const { book } = addMove(emptyBook(), b, parseCoord('j10'))
    // 左右反転した花月（h8 h9 g9）では f10 が同じ手
    const mirrored = board('h8', 'h9', 'g9')
    const c = candidates(book, mirrored)
    expect(c.map((x) => toCoord(x.point))).toEqual(['f10'])
    expect(matchEdge(book, mirrored, parseCoord('f10'))).toBeTruthy()
    expect(matchEdge(book, mirrored, parseCoord('j10'))).toBeFalsy()
  })
  it('合流局面は入ってくる手が複数になる', () => {
    let bk = emptyBook()
    const k = ['h8', 'h9', 'i9']
    for (const line of [
      ['j10', 'g7', 'g9'],
      ['g9', 'g7', 'j10'],
    ]) {
      for (let n = 0; n < line.length; n++)
        bk = addMove(bk, board(...k, ...line.slice(0, n)), parseCoord(line[n])).book
    }
    const merged = canonicalize(board(...k, 'j10', 'g7', 'g9')).id
    expect(parentCounts(bk).get(merged)).toBe(2)
    expect(validateBook(bk)).toEqual([])
  })
  it('最初に追加した手が主変化、削除で次が主変化になる', () => {
    const b = board('h8', 'h9', 'i9')
    let bk = addMove(emptyBook(), b, parseCoord('j10')).book
    bk = addMove(bk, b, parseCoord('g7')).book
    const root = canonicalize(b).id
    expect(bk.nodes[root].moves.map((e) => !!e.main)).toEqual([true, false])
    bk = removeEdge(bk, root, bk.nodes[root].moves[0].next)
    expect(bk.nodes[root].moves).toHaveLength(1)
    expect(bk.nodes[root].moves[0].main).toBe(true)
    expect(questionPositions(bk, root)).toEqual([root])
  })
  it('禁手は定石手として追加できない', () => {
    // 黒番で三三になる点
    const b = board('f8', 'a1', 'g8', 'a2', 'h6', 'a3', 'h7', 'a4')
    expect(() => addMove(emptyBook(), b, parseCoord('h8'))).toThrow()
  })
})

describe('同梱データ', () => {
  it('検証エラーがない', () => {
    expect(validateBook(normalizeBook(bundled))).toEqual([])
  })
})
