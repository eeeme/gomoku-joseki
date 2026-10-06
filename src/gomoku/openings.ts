// 定石の名前：26珠型（3手目まで）＋必要なら先の形も足せる表。
// 1手目 h8（天元）。直接打ちは2手目 h9（真上）、間接打ちは2手目 i9（右上）。
// 3手目の位置は国際連珠連盟（RIF）の標準の番号付け（直接1〜13・間接1〜13）に合わせている。
// 名前と手順は一般に広く知られている事実だけを使う。足すときはこの表に1行足せばよい。
import { type Pos, START_POS, applyMove, canonicalKey, parsePos, strToMove } from './core'

export interface OpeningDef {
  name: string
  kana: string
  type: '直接' | '間接'
  no: number
  moves: string // 'h8h9i9'
}

const D = (no: number, name: string, kana: string, third: string): OpeningDef => ({ name, kana, type: '直接', no, moves: `h8h9${third}` })
const I = (no: number, name: string, kana: string, third: string): OpeningDef => ({ name, kana, type: '間接', no, moves: `h8i9${third}` })

export const OPENINGS: OpeningDef[] = [
  D(1, '寒星', 'かんせい', 'h10'),
  D(2, '渓月', 'けいげつ', 'i10'),
  D(3, '疎星', 'そせい', 'j10'),
  D(4, '花月', 'かげつ', 'i9'),
  D(5, '残月', 'ざんげつ', 'j9'),
  D(6, '雨月', 'うげつ', 'i8'),
  D(7, '金星', 'きんせい', 'j8'),
  D(8, '松月', 'しょうげつ', 'h7'),
  D(9, '丘月', 'きゅうげつ', 'i7'),
  D(10, '新月', 'しんげつ', 'j7'),
  D(11, '瑞星', 'ずいせい', 'h6'),
  D(12, '山月', 'さんげつ', 'i6'),
  D(13, '遊星', 'ゆうせい', 'j6'),
  I(1, '長星', 'ちょうせい', 'j10'),
  I(2, '峡月', 'きょうげつ', 'j9'),
  I(3, '恒星', 'こうせい', 'j8'),
  I(4, '水月', 'すいげつ', 'j7'),
  I(5, '流星', 'りゅうせい', 'j6'),
  I(6, '雲月', 'うんげつ', 'i8'),
  I(7, '浦月', 'ほげつ', 'i7'),
  I(8, '嵐月', 'らんげつ', 'i6'),
  I(9, '銀月', 'ぎんげつ', 'h7'),
  I(10, '明星', 'みょうじょう', 'h6'),
  I(11, '斜月', 'しゃげつ', 'g7'),
  I(12, '名月', 'めいげつ', 'g6'),
  I(13, '彗星', 'すいせい', 'f6'),
]

/** 標準の向きの3手（'h8h9i9' など）の集合。向きの正規化に使う */
export const OPENING_LINES = new Set(OPENINGS.map((o) => o.moves))

const split = (s: string) => s.match(/[a-o](?:1[0-5]|[1-9])/g) ?? []

let index: Map<string, string> | null = null

/** 局面（対称形をまとめたキー）→ 名前 */
function openingIndex(): Map<string, string> {
  if (index) return index
  index = new Map()
  for (const o of OPENINGS) {
    let pos = parsePos(START_POS)
    for (const s of split(o.moves)) pos = applyMove(pos, strToMove(s))
    index.set(canonicalKey(pos), o.name)
  }
  return index
}

/** その局面がちょうど珠型の形なら名前（向き・手順前後は問わない） */
export function openingAt(pos: Pos): string | null {
  // 珠型は3手の局面だけなので、石が3つでなければ調べない
  let n = 0
  for (const c of pos.board) if (c && ++n > 3) return null
  if (n !== 3) return null
  return openingIndex().get(canonicalKey(pos)) ?? null
}

/** 手順をたどって、最後に成立した珠型名（その先へ進んでも名前を引き継ぐ） */
export function openingOfLine(rootPos: string, moves: string[]): string | null {
  let pos = parsePos(rootPos)
  let name = openingAt(pos)
  for (const s of moves.slice(0, 3)) {
    pos = applyMove(pos, strToMove(s))
    name = openingAt(pos) ?? name
  }
  return name
}
