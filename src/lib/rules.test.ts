import { describe, expect, it } from 'vitest'
import { BLACK, WHITE, idx, parseCoord } from './coord'
import { foulOf, forbiddenPoints, newBoard, play, sideToMove, type Board } from './rules'

/** 黒・白の石を直接配置した盤を作る（手順の正しさは問わない） */
function setup(black: string[], white: string[] = []): Board {
  const b = newBoard()
  for (const c of black) {
    const p = parseCoord(c)
    b[idx(p.x, p.y)] = BLACK
  }
  for (const c of white) {
    const p = parseCoord(c)
    b[idx(p.x, p.y)] = WHITE
  }
  return b
}
const at = (c: string) => parseCoord(c)

describe('手番', () => {
  it('石数が同じなら黒番、黒が多ければ白番', () => {
    expect(sideToMove(newBoard())).toBe(BLACK)
    expect(sideToMove(setup(['h8']))).toBe(WHITE)
    expect(sideToMove(setup(['h8'], ['h9']))).toBe(BLACK)
  })
})

describe('五連', () => {
  it('黒のちょうど五で勝ち', () => {
    const b = setup(['d8', 'e8', 'f8', 'g8'], ['a1', 'a2', 'a3', 'a4'])
    const r = play(b, at('h8'))
    expect(r.ok && r.win).toBe(true)
  })
  it('白は長連でも勝ち', () => {
    const b = setup(['a1', 'a3', 'a5', 'a7', 'a9', 'c1'], ['d8', 'e8', 'g8', 'h8', 'i8'])
    const r = play(b, at('f8'))
    expect(r.ok && r.win).toBe(true)
  })
  it('五連と同時に禁手形になっても五連が優先', () => {
    // 横に五、縦に三三的な形でも勝ち
    const b = setup(['d8', 'e8', 'f8', 'g8', 'h9', 'h10', 'i9', 'j10'], ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'])
    expect(foulOf(b, at('h8'))).toBeNull()
  })
})

describe('禁手', () => {
  it('長連（六連）は禁手', () => {
    const b = setup(['c8', 'd8', 'e8', 'g8', 'h8'])
    expect(foulOf(b, at('f8'))).toBe('overline')
  })
  it('四四（2方向）は禁手', () => {
    const b = setup(['e8', 'f8', 'g8', 'h5', 'h6', 'h7'], ['d8', 'h4'])
    expect(foulOf(b, at('h8'))).toBe('double-four')
  })
  it('一直線の四四（X.XXX.X）も禁手', () => {
    const b = setup(['d8', 'f8', 'g8', 'j8'])
    // h8 に打つと d8 _ f8 g8 h8 _ j8 → e8・i8 の二つの四
    expect(foulOf(b, at('h8'))).toBe('double-four')
  })
  it('三三（活三が2つ）は禁手', () => {
    const b = setup(['f8', 'g8', 'h6', 'h7'])
    expect(foulOf(b, at('h8'))).toBe('double-three')
  })
  it('飛び三を含む三三も禁手', () => {
    const b = setup(['e8', 'g8', 'h6', 'h7'])
    expect(foulOf(b, at('h8'))).toBe('double-three')
  })
  it('片方が止められた三は三と数えない（禁手でない）', () => {
    const b = setup(['f8', 'g8', 'h6', 'h7'], ['e8', 'i8'])
    expect(foulOf(b, at('h8'))).toBeNull()
  })
  it('四三は禁手ではない', () => {
    const b = setup(['e8', 'f8', 'g8', 'h6', 'h7'], ['d8'])
    expect(foulOf(b, at('h8'))).toBeNull()
  })
  it('端で達四になれない三は三ではない', () => {
    // a列（盤端）に沿った三：a2 a3 に a4 を足しても a1 側が盤端
    const b = setup(['a2', 'a3', 'b5', 'c5'], ['a6'])
    expect(foulOf(b, at('a4'))).toBeNull()
  })
  it('禁手点は着手できない', () => {
    const b = setup(['f8', 'g8', 'h6', 'h7'], ['a1', 'a2', 'a3', 'a4'])
    const r = play(b, at('h8'))
    expect(r.ok).toBe(false)
  })
  it('白には禁手がない', () => {
    const b = setup(['a1', 'a3', 'a5', 'a7', 'a9'], ['f8', 'g8', 'h6', 'h7'])
    const r = play(b, at('h8'))
    expect(r.ok).toBe(true)
  })
  it('forbiddenPoints が禁手点を列挙する', () => {
    const b = setup(['f8', 'g8', 'h6', 'h7'], ['a1', 'a2', 'a3', 'a4'])
    const pts = forbiddenPoints(b).map((p) => `${p.x},${p.y}`)
    expect(pts).toContain('7,7')
  })
})
