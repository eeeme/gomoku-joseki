import { describe, expect, it } from 'vitest'
import {
  START_POS, applyMove, canonicalKey, foulAt, forbiddenPoints, fiveWinner, isLegal, isOver, moveToStr, parsePos,
  strToMove, toPosString, transformPos, type Cell, type Pos, N,
} from './core'
import { normalizeLine, splitMoves, transformLine } from './notation'
import { diagram, exportAllLines, exportMainLine, mainLine, parseKifu, playLine, winnerOf } from './kifu'
import { OPENINGS, openingAt, openingOfLine } from './openings'
import { mergeImport, newBook, toBookMove } from '../book/book'
import { similarity } from '../book/search'

const play = (moves: string) => {
  let pos = parsePos(START_POS)
  for (const s of splitMoves(moves)) pos = applyMove(pos, strToMove(s))
  return pos
}
/** 石を直接置いた局面（手順の正しさは問わない） */
function setup(black: string[], white: string[] = [], turn: 0 | 1 = 0): Pos {
  const board = new Array<Cell>(N).fill(0)
  for (const c of black) board[strToMove(c)] = 1
  for (const c of white) board[strToMove(c)] = 2
  return { board, turn }
}
const sq = strToMove

describe('ルール', () => {
  it('1手目は天元', () => {
    const p = parsePos(START_POS)
    expect(isLegal(p, sq('h8'))).toBe(true)
    expect(isLegal(p, sq('a1'))).toBe(false)
    expect(toPosString(applyMove(p, sq('h8'))).length).toBe(N + 1)
  })
  it('座標 a1〜o15', () => {
    expect(moveToStr(sq('o15'))).toBe('o15')
    expect(splitMoves('H8I9J10 k11,a1')).toEqual(['h8', 'i9', 'j10', 'k11', 'a1'])
  })
  it('黒のちょうど五で勝ち・白は長連でも勝ち', () => {
    expect(fiveWinner(setup(['d8', 'e8', 'f8', 'g8', 'h8'], ['a1', 'a2', 'a3', 'a4']))).toBe(0)
    expect(fiveWinner(setup(['a1', 'a3', 'a5', 'a7', 'a9', 'c1'], ['c8', 'd8', 'e8', 'f8', 'g8', 'h8']))).toBe(1)
    expect(fiveWinner(setup(['c8', 'd8', 'e8', 'f8', 'g8', 'h8']))).toBeNull()
  })
  it('五連のあとは打てない', () => {
    const p = setup(['d8', 'e8', 'f8', 'g8', 'h8'], ['a1', 'a2', 'a3', 'a4'], 1)
    expect(isOver(p)).toBe(true)
    expect(isLegal(p, sq('o15'))).toBe(false)
  })
})

describe('禁手', () => {
  it('長連', () => expect(foulAt(setup(['c8', 'd8', 'e8', 'g8', 'h8']), sq('f8'))).toBe('長連'))
  it('四四（2方向）', () => expect(foulAt(setup(['e8', 'f8', 'g8', 'h5', 'h6', 'h7'], ['d8', 'h4']), sq('h8'))).toBe('四四'))
  it('一直線の四四', () => expect(foulAt(setup(['d8', 'f8', 'g8', 'j8']), sq('h8'))).toBe('四四'))
  it('三三', () => expect(foulAt(setup(['f8', 'g8', 'h6', 'h7']), sq('h8'))).toBe('三三'))
  it('飛び三を含む三三', () => expect(foulAt(setup(['e8', 'g8', 'h6', 'h7']), sq('h8'))).toBe('三三'))
  it('止められた三は数えない', () => expect(foulAt(setup(['f8', 'g8', 'h6', 'h7'], ['e8', 'i8']), sq('h8'))).toBeNull())
  it('四三は禁手ではない', () => expect(foulAt(setup(['e8', 'f8', 'g8', 'h6', 'h7'], ['d8']), sq('h8'))).toBeNull())
  it('五連は禁手より優先', () => {
    expect(foulAt(setup(['d8', 'e8', 'f8', 'g8', 'h9', 'h10', 'i9', 'j10']), sq('h8'))).toBeNull()
  })
  it('禁手点の一覧と着手の禁止。白には禁手がない', () => {
    const p = setup(['f8', 'g8', 'h6', 'h7'], ['a1', 'a2', 'a3', 'a4'])
    expect(forbiddenPoints(p)).toContain(sq('h8'))
    expect(isLegal(p, sq('h8'))).toBe(false)
    expect(() => applyMove(p, sq('h8'))).toThrow(/三三/)
    const w = setup(['a1', 'a3', 'a5', 'a7', 'a9'], ['f8', 'g8', 'h6', 'h7'], 1)
    expect(isLegal(w, sq('h8'))).toBe(true)
    expect(forbiddenPoints(w)).toEqual([])
  })
})

describe('26珠型', () => {
  it('26個すべて別の局面で、名前が引ける', () => {
    expect(OPENINGS).toHaveLength(26)
    const keys = new Set(OPENINGS.map((o) => canonicalKey(play(o.moves))))
    expect(keys.size).toBe(26)
    expect(openingAt(play('h8h9i9'))).toBe('花月')
    expect(openingAt(play('h8i9i7'))).toBe('浦月')
  })
  it('向き違い・手順前後でも分かる', () => {
    // 花月を左右反転（h8 h9 g9）と、180度回転（h8 h7 g7）
    expect(openingAt(play('h8h9g9'))).toBe('花月')
    expect(openingAt(play('h8h7g7'))).toBe('花月')
    expect(openingOfLine(START_POS, ['h8', 'i9', 'i7', 'j8', 'g8'])).toBe('浦月')
  })
})

describe('向きの正規化', () => {
  it('直接打ちは2手目 h9、間接打ちは2手目 i9 に', () => {
    for (const s of ['h9', 'i8', 'h7', 'g8']) expect(normalizeLine(['h8', s])[1]).toBe('h9')
    for (const s of ['i9', 'g9', 'g7', 'i7']) expect(normalizeLine(['h8', s])[1]).toBe('i9')
  })
  it('珠型は標準の向きにそろう', () => {
    expect(normalizeLine(['h8', 'h9', 'g9'])).toEqual(['h8', 'h9', 'i9']) // 花月の反転
    expect(normalizeLine(['h8', 'g7', 'g9'])).toEqual(['h8', 'i9', 'i7']) // 浦月を回したもの
    for (const o of OPENINGS) {
      const l = splitMoves(o.moves)
      for (let k = 0; k < 8; k++) {
        expect(normalizeLine(transformLine(l, k))).toEqual(l)
      }
    }
  })
  it('正規化しても局面は対称形', () => {
    const raw = ['h8', 'g7', 'g9', 'f8', 'j6']
    expect(canonicalKey(play(raw.join('')))).toBe(canonicalKey(play(normalizeLine(raw).join(''))))
  })
  it('8つの対称形は同じキー', () => {
    const p = play('h8i9i7j8')
    for (let k = 0; k < 8; k++) expect(canonicalKey(transformPos(p, k))).toBe(canonicalKey(p))
  })
  it('盤で打った2・3手目も標準の向きで記録', () => {
    const b = newBook('t')
    mergeImport(b, parseKifu('h8'))
    const h8 = b.nodes[b.rootId].children[0]
    expect(toBookMove(b, h8, sq('g7'))).toEqual({ move: 'i9', rotated: true })
    mergeImport(b, parseKifu('h8i9'))
    const i9 = b.nodes[h8].children[0]
    expect(toBookMove(b, i9, sq('g8'))).toEqual({ move: 'h7', rotated: true }) // 銀月の反転
    expect(toBookMove(b, i9, sq('i8'))).toEqual({ move: 'i8', rotated: false })
  })
})

describe('棋譜の読み書き', () => {
  it('棋譜文字列（大文字・空白まじり・途中改行）', () => {
    const t = parseKifu('H8 I9\nI7 j8')
    expect(t.format).toBe('棋譜文字列')
    expect(mainLine(t)).toEqual(['h8', 'i9', 'i7', 'j8'])
    expect(t.title).toBe('浦月')
  })
  it('向き違いの棋譜は標準の向きに直る', () => {
    const t = parseKifu('h8g7g9')
    expect(mainLine(t)).toEqual(['h8', 'i9', 'i7'])
    expect(t.normalized).toBe(true)
  })
  it('複数行は分岐付きの1冊に。向き違いの同じ手順は1本にまとまる', () => {
    const t = parseKifu('h8h9i9\nh8i9i7\nh8h9g9j10\n')
    const h8 = t.root.children[0]
    expect(t.root.children.length).toBe(1)
    expect(h8.children.map((c) => c.move)).toEqual(['h9', 'i9'])
    expect(h8.children[0].children.map((c) => c.move)).toEqual(['i9'])
    expect(h8.children[0].children[0].children.map((c) => c.move)).toEqual(['f10'])
  })
  it('打てない手はエラー（何手目か付き）', () => {
    expect(() => playLine(START_POS, ['h8', 'h8'])).toThrow(/2手目/)
    expect(() => parseKifu('a1b2')).toThrow(/天元/)
  })
  it('盤面図から', () => {
    const p = play('h8i9i7')
    const t = parseKifu(diagram(p))
    expect(t.format).toBe('盤面図')
    expect(t.rootPos).toBe(toPosString(p))
  })
  it('書き出し：本線と全変化。取り込み直すと同じ木', () => {
    const b = newBook('test')
    mergeImport(b, parseKifu('h8h9i9j10\nh8h9i9g7\nh8i9i7'))
    expect(exportMainLine(b)).toBe('h8h9i9j10')
    expect(exportAllLines(b).trim().split('\n')).toEqual(['h8h9i9j10', 'h8h9i9g7', 'h8i9i7'])
    const b2 = newBook('re')
    expect(mergeImport(b2, parseKifu(exportAllLines(b))).added).toBe(Object.keys(b.nodes).length - 1)
  })
  it('五連まで打った棋譜は勝敗を入れる', () => {
    const t = parseKifu('h8a1i8a2j8a3k8a4l8')
    expect(t.meta?.result).toBe('黒勝ち')
    expect(winnerOf('黒勝ち')).toBe(0)
    expect(winnerOf('白勝ち')).toBe(1)
    expect(winnerOf('引き分け')).toBe('draw')
  })
})

describe('局面検索の似ている度合い', () => {
  it('同じ局面は1、対称形も1', () => {
    const p = play('h8i9i7')
    expect(similarity(p, p)).toBe(1)
    expect(similarity(p, transformPos(p, 3))).toBe(1)
    expect(similarity(p, play('h8i9i8'))).toBeLessThan(1)
  })
})
