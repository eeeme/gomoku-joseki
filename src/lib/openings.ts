// 26珠型（入口）。1手目 h8（天元）固定。
// 直接打ち：2手目 h9（真上）／間接打ち：2手目 i9（右上）。
// 3手目の位置は国際連珠連盟（RIF）の標準番号付け（直接1〜13・間接1〜13）に対応。

export type OpeningType = 'direct' | 'indirect'

export interface OpeningDef {
  id: string // 'D4' など
  no: number
  name: string
  kana: string
  type: OpeningType
  moves: [string, string, string]
}

const d = (no: number, name: string, kana: string, third: string): OpeningDef => ({
  id: `D${no}`,
  no,
  name,
  kana,
  type: 'direct',
  moves: ['h8', 'h9', third],
})
const i = (no: number, name: string, kana: string, third: string): OpeningDef => ({
  id: `I${no}`,
  no,
  name,
  kana,
  type: 'indirect',
  moves: ['h8', 'i9', third],
})

export const OPENINGS: OpeningDef[] = [
  d(1, '寒星', 'かんせい', 'h10'),
  d(2, '渓月', 'けいげつ', 'i10'),
  d(3, '疎星', 'そせい', 'j10'),
  d(4, '花月', 'かげつ', 'i9'),
  d(5, '残月', 'ざんげつ', 'j9'),
  d(6, '雨月', 'うげつ', 'i8'),
  d(7, '金星', 'きんせい', 'j8'),
  d(8, '松月', 'しょうげつ', 'h7'),
  d(9, '丘月', 'きゅうげつ', 'i7'),
  d(10, '新月', 'しんげつ', 'j7'),
  d(11, '瑞星', 'ずいせい', 'h6'),
  d(12, '山月', 'さんげつ', 'i6'),
  d(13, '遊星', 'ゆうせい', 'j6'),
  i(1, '長星', 'ちょうせい', 'j10'),
  i(2, '峡月', 'きょうげつ', 'j9'),
  i(3, '恒星', 'こうせい', 'j8'),
  i(4, '水月', 'すいげつ', 'j7'),
  i(5, '流星', 'りゅうせい', 'j6'),
  i(6, '雲月', 'うんげつ', 'i8'),
  i(7, '浦月', 'ほげつ', 'i7'),
  i(8, '嵐月', 'らんげつ', 'i6'),
  i(9, '銀月', 'ぎんげつ', 'h7'),
  i(10, '明星', 'みょうじょう', 'h6'),
  i(11, '斜月', 'しゃげつ', 'g7'),
  i(12, '名月', 'めいげつ', 'g6'),
  i(13, '彗星', 'すいせい', 'f6'),
]

export const openingById = (id: string) => OPENINGS.find((o) => o.id === id)
