import { useMemo, useState } from 'react'
import Board from '../components/Board'
import { Banner, Header } from '../components/ui'
import { parseCoord, samePoint, toCoord, type Point } from '../lib/coord'
import {
  EVAL_LABEL,
  addMove,
  candidates as candidatesOf,
  matchEdge,
  parentCounts,
  removeEdge,
  updateEdge,
  updateNode,
  type Eval,
} from '../lib/book'
import { openingById } from '../lib/openings'
import { FOUL_LABEL, foulOf, makesFive, sideToMove } from '../lib/rules'
import { canonicalize } from '../lib/symmetry'
import { usePosition, useApp } from '../state'

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export default function Browse({ openingId }: { openingId: string }) {
  const { book, setBook, settings, toast } = useApp()
  const op = openingById(openingId)!
  const start = useMemo(() => op.moves.map(parseCoord), [op])
  const [line, setLine] = useState<Point[]>(start)
  const [cursor, setCursor] = useState(3)
  const [edit, setEdit] = useState(false)

  const moves = useMemo(() => line.slice(0, cursor), [line, cursor])
  const pos = usePosition(moves)
  const { id: nodeId } = canonicalize(pos.board)
  const node = book.nodes[nodeId]
  const cands = candidatesOf(book, pos.board)
  const merges = parentCounts(book).get(nodeId) ?? 0

  // ここに来た手（直前の手）
  const parentBoard = usePosition(moves.slice(0, -1)).board
  const parentId = canonicalize(parentBoard).id
  const arrived = cursor > 3 ? matchEdge(book, parentBoard, moves[moves.length - 1]) : undefined
  const ended = pos.last ? makesFive(pos.board, pos.last, sideToMove(parentBoard)) : false

  const goPoint = (p: Point) => {
    if (samePoint(line[cursor], p)) setCursor(cursor + 1)
    else {
      setLine([...moves, p])
      setCursor(cursor + 1)
    }
  }
  const forward = () => {
    if (line[cursor]) return setCursor(cursor + 1)
    const main = cands.find((c) => c.edge.main) ?? cands[0]
    if (main) goPoint(main.point)
  }

  const onPlay = (p: Point) => {
    if (ended) return
    if (!edit) {
      if (cands.some((c) => samePoint(c.point, p))) goPoint(p)
      return
    }
    try {
      const { book: nb } = addMove(book, pos.board, p)
      setBook(nb)
      goPoint(p)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <main>
      <Header
        title={op.name}
        sub={op.kana}
        back={{ name: 'list' }}
        right={
          <button className={`chip ${edit ? 'on' : ''}`} onClick={() => setEdit(!edit)}>
            {edit ? '編集中' : '編集'}
          </button>
        }
      />
      <Banner text={op.name} kana={op.kana} />

      <div className="board-wrap">
        <Board
          board={pos.board}
          numbers={pos.numbers}
          showNumbers={settings.showNumbers}
          last={pos.last}
          forbidden={pos.forbidden}
          candidates={cands.map((c, i) => ({ point: c.point, label: LABELS[i] ?? '?', main: c.edge.main }))}
          interactive
          instant={!edit}
          onPlay={onPlay}
          onForbidden={(p) => toast(`禁手（${FOUL_LABEL[foulOf(pos.board, p)!]}）`)}
        />
      </div>

      <div className="controls">
        <button className="btn" onClick={() => setCursor(3)} disabled={cursor <= 3}>
          ⏮
        </button>
        <button className="btn" onClick={() => setCursor(cursor - 1)} disabled={cursor <= 3}>
          ◀
        </button>
        <span className="move-no">{cursor}手</span>
        <button className="btn" onClick={forward} disabled={!line[cursor] && !cands.length}>
          ▶
        </button>
      </div>

      <section className="panel">
        {arrived?.comment && <p className="comment">{arrived.comment}</p>}
        {node?.eval && <span className={`eval ${node.eval}`}>{EVAL_LABEL[node.eval]}</span>}
        {node?.note && <p className="note">{node.note}</p>}
        {merges > 1 && <p className="merge">⇆ 別の手順からも来る局面（{merges}通り）</p>}
        {ended && <p className="note">五連</p>}

        {cands.length > 0 && (
          <ul className="cand-list">
            {cands.map((c, i) => (
              <li key={c.edge.next}>
                <button onClick={() => goPoint(c.point)}>
                  <b className={c.edge.main ? 'main' : ''}>{LABELS[i]}</b>
                  <span className="coord">{toCoord(c.point)}</span>
                  {c.edge.main && <span className="star-mark">主</span>}
                  {c.edge.comment && <span className="muted ellipsis">{c.edge.comment}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!cands.length && !edit && !ended && !node?.eval && (
          <p className="muted small">この先の定石は未登録です。右上の「編集」から盤をタップして登録できます。</p>
        )}
      </section>

      {edit && (
        <section className="panel edit">
          <p className="muted small">盤をタップ → もう一度タップで定石手を登録</p>
          {arrived && (
            <>
              <label className="field">
                <span>{toCoord(moves[moves.length - 1])} のコメント</span>
                <textarea
                  key={`c${parentId}${arrived.next}`}
                  defaultValue={arrived.comment ?? ''}
                  rows={2}
                  onBlur={(e) => setBook(updateEdge(book, parentId, arrived.next, { comment: e.target.value || undefined }))}
                />
              </label>
              <div className="row2">
                <button
                  className="btn"
                  disabled={arrived.main}
                  onClick={() => setBook(updateEdge(book, parentId, arrived.next, { main: true }))}
                >
                  {arrived.main ? '主変化' : '主変化にする'}
                </button>
                <button
                  className="btn danger"
                  onClick={() => {
                    if (!window.confirm('この手と、この先の変化を削除しますか？')) return
                    setBook(removeEdge(book, parentId, arrived.next))
                    setLine(moves.slice(0, -1))
                    setCursor(cursor - 1)
                  }}
                >
                  この手を削除
                </button>
              </div>
            </>
          )}
          <label className="field">
            <span>この局面の評価</span>
            <select
              value={node?.eval ?? ''}
              onChange={(e) => setBook(updateNode(book, nodeId, { eval: (e.target.value || undefined) as Eval | undefined }))}
            >
              <option value="">なし</option>
              <option value="black">黒有利</option>
              <option value="white">白有利</option>
              <option value="even">互角</option>
            </select>
          </label>
          <label className="field">
            <span>この局面のメモ</span>
            <textarea
              key={`n${nodeId}`}
              defaultValue={node?.note ?? ''}
              rows={2}
              onBlur={(e) => setBook(updateNode(book, nodeId, { note: e.target.value || undefined }))}
            />
          </label>
        </section>
      )}
    </main>
  )
}
