// 初回起動時に入れるサンプル（1行1手順の棋譜文字列）。取り込み機能の動作見本も兼ねる
// 26珠型の3手目までだけを入れる（4手目より先は、自分で調べて足していく前提）
import { OPENINGS } from '../gomoku/openings'

export const SAMPLE_NAME = '26珠型（3手目まで）'

export const SAMPLE_LINES = OPENINGS.map((o) => o.moves).join('\n') + '\n'

/** サンプルの手順に付けておくメモ（手順 → メモ） */
export const SAMPLE_NOTES: Record<string, string> = {
  h8: '1手目は天元（H8）。',
  h8h9: '直接打ち：2手目を1手目の真横（縦・横）に打つ形。盤は2手目が H9 になる向きにそろえて記録します。',
  h8i9: '間接打ち：2手目を1手目の斜めに打つ形。盤は2手目が I9 になる向きにそろえて記録します。',
}
