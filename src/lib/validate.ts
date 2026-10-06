// 定石データの自動チェック
// ・禁手や石のある点を定石手として登録していないか
// ・対称形の重複（同じ局面に行く手が2つ）がないか
// ・next の局面IDが実際の着手結果と一致するか
import { parseCoord } from './coord'
import type { Book } from './book'
import { OPENINGS } from './openings'
import { boardFromMoves, play, type Board } from './rules'
import { canonicalize, invertT } from './symmetry'

export interface Issue {
  nodeId: string
  message: string
}

export function validateBook(book: Book): Issue[] {
  const issues: Issue[] = []
  const visited = new Set<string>()
  const queue: Board[] = OPENINGS.map((o) => boardFromMoves(o.moves.map(parseCoord)))
  while (queue.length) {
    const board = queue.shift()!
    const { id, t } = canonicalize(board)
    if (visited.has(id)) continue
    visited.add(id)
    const node = book.nodes[id]
    if (!node) continue
    const seenNext = new Set<string>()
    for (const e of node.moves) {
      let p
      try {
        p = invertT(t, parseCoord(e.to))
      } catch {
        issues.push({ nodeId: id, message: `座標が不正: ${e.to}` })
        continue
      }
      const r = play(board, p)
      if (!r.ok) {
        issues.push({ nodeId: id, message: `${e.to} は着手できない手（${r.reason}）` })
        continue
      }
      const nid = canonicalize(r.board).id
      if (nid !== e.next) issues.push({ nodeId: id, message: `${e.to} の next が実際の局面と不一致` })
      if (seenNext.has(nid)) issues.push({ nodeId: id, message: `${e.to} は対称形の重複` })
      seenNext.add(nid)
      if (!r.win) queue.push(r.board)
    }
    if (node.moves.length && node.moves.filter((e) => e.main).length !== 1)
      issues.push({ nodeId: id, message: '主変化（main）がちょうど1つではない' })
  }
  return issues
}
