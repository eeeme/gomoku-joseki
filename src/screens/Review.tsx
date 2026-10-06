import { useMemo, useState } from 'react'
import Board from '../components/Board'
import { Header } from '../components/ui'
import { parseCoord, toCoord, type Point } from '../lib/coord'
import { acceptable, candidates as candidatesOf, matchEdge } from '../lib/book'
import { openingById } from '../lib/openings'
import { recordAnswer, reviewQueue, type StudyRecord } from '../lib/records'
import { FOUL_LABEL, foulOf } from '../lib/rules'
import { applyT } from '../lib/symmetry'
import { useApp, usePosition } from '../state'

interface Item {
  rec: StudyRecord
  moves: Point[]
}

export default function Review() {
  const { book, records, settings, putRecord, toast, go } = useApp()
  // 開いた時点のキューで固定する（解いた順に消えていく）
  const items = useMemo<Item[]>(() => {
    return reviewQueue([...records.values()])
      .filter((r) => book.nodes[r.positionId]?.moves.length)
      .map((rec) => {
        const t = settings.symmetric ? Math.floor(Math.random() * 8) : 0
        return { rec, moves: rec.path.map((c) => applyT(t, parseCoord(c))) }
      })
  }, [])
  const [i, setI] = useState(0)
  const [result, setResult] = useState<null | { correct: boolean; played: Point }>(null)

  const item = items[i]
  const pos = usePosition(item?.moves ?? [])
  const ok = item ? acceptable(candidatesOf(book, pos.board), settings.judge) : []

  if (!item) {
    return (
      <main>
        <Header title="復習" />
        <section className="panel center">
          <p className="turn">{items.length ? '復習おわり' : '今日の復習はありません'}</p>
          <button className="btn primary" onClick={() => go({ name: 'home' })}>
            ホームへ
          </button>
        </section>
      </main>
    )
  }

  const answer = (p: Point) => {
    const hit = matchEdge(book, pos.board, p)
    const correct = !!hit && ok.some((c) => c.edge.next === hit.next)
    putRecord(
      recordAnswer(
        records.get(item.rec.positionId),
        { positionId: item.rec.positionId, side: item.rec.side, openingId: item.rec.openingId, path: item.rec.path },
        correct,
      ),
    )
    setResult({ correct, played: p })
  }
  const next = () => {
    setResult(null)
    setI(i + 1)
  }

  const op = openingById(item.rec.openingId)
  const shownMoves = result?.correct ? [...item.moves, result.played] : item.moves
  return (
    <main>
      <Header title="復習" sub={`残り ${items.length - i}`} />
      <ReviewBoard
        moves={shownMoves}
        interactive={!result}
        onPlay={answer}
        onForbidden={(p) => toast(`禁手（${FOUL_LABEL[foulOf(pos.board, p)!]}）`)}
        ghost={result && !result.correct ? result.played : null}
        correct={result && !result.correct ? ok.map((c) => c.point) : []}
        showNumbers={settings.showNumbers}
      />
      <section className="panel status">
        <p className="muted small">
          {op?.name}・{item.rec.side === 'black' ? '黒番' : '白番'}・{item.moves.length + 1}手目
        </p>
        {!result && <p className="turn">次の一手は？</p>}
        {result?.correct && <p className="ok">正解</p>}
        {result && !result.correct && <p className="ng">不正解　正解：{ok.map((c) => toCoord(c.point)).join('・')}</p>}
        {result && (
          <button className="btn primary" onClick={next}>
            次へ
          </button>
        )}
      </section>
    </main>
  )
}

function ReviewBoard({ moves, ...rest }: { moves: Point[] } & Omit<React.ComponentProps<typeof Board>, 'board'>) {
  const pos = usePosition(moves)
  return (
    <div className="board-wrap">
      <Board board={pos.board} numbers={pos.numbers} last={pos.last} forbidden={pos.forbidden} {...rest} />
    </div>
  )
}
