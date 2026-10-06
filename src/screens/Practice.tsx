import { useEffect, useMemo, useState } from 'react'
import Board from '../components/Board'
import { Banner, Header } from '../components/ui'
import { parseCoord, toCoord, type Point } from '../lib/coord'
import { EVAL_LABEL, acceptable, candidates as candidatesOf, matchEdge } from '../lib/book'
import { openingById } from '../lib/openings'
import { recordAnswer } from '../lib/records'
import { FOUL_LABEL, foulOf } from '../lib/rules'
import { canonicalize } from '../lib/symmetry'
import { useApp, usePosition } from '../state'

type Phase = 'opponent' | 'you' | 'wrong' | 'done'

export default function Practice({ openingId, side }: { openingId: string; side: 'black' | 'white' }) {
  const { book, settings, records, putRecord, toast, go } = useApp()
  const op = openingById(openingId)!
  const start = useMemo(() => op.moves.map(parseCoord), [op])
  const [moves, setMoves] = useState<Point[]>(start)
  const [ghost, setGhost] = useState<Point | null>(null)
  const [score, setScore] = useState({ ok: 0, ng: 0 })
  const [round, setRound] = useState(0)

  const pos = usePosition(moves)
  const cands = candidatesOf(book, pos.board)
  const ok = acceptable(cands, settings.judge)
  const node = book.nodes[canonicalize(pos.board).id]

  let phase: Phase
  if (!cands.length) phase = 'done'
  else if (ghost) phase = 'wrong'
  else phase = pos.turn === side ? 'you' : 'opponent'

  // 相手番は定石手からランダムに自動で打つ
  useEffect(() => {
    if (phase !== 'opponent') return
    const list = candidatesOf(book, pos.board)
    const t = window.setTimeout(() => {
      const c = list[Math.floor(Math.random() * list.length)]
      setMoves((m) => [...m, c.point])
    }, 450)
    return () => window.clearTimeout(t)
  }, [phase, book, pos.board])

  const answer = (p: Point) => {
    const hit = matchEdge(book, pos.board, p)
    const correct = !!hit && ok.some((c) => c.edge.next === hit.next)
    const positionId = canonicalize(pos.board).id
    putRecord(
      recordAnswer(records.get(positionId), { positionId, side, openingId, path: moves.map(toCoord) }, correct),
    )
    if (correct) {
      setScore((s) => ({ ...s, ok: s.ok + 1 }))
      setMoves([...moves, p])
    } else {
      setScore((s) => ({ ...s, ng: s.ng + 1 }))
      setGhost(p)
    }
  }

  const continueMain = () => {
    const c = ok.find((x) => x.edge.main) ?? ok[0]
    setGhost(null)
    setMoves([...moves, c.point])
  }

  const restart = () => {
    setMoves(start)
    setGhost(null)
    setRound((r) => r + 1)
  }

  return (
    <main>
      <Header
        title={op.name}
        sub={`あなた：${side === 'black' ? '黒' : '白'}`}
        back={{ name: 'list' }}
        right={
          <span className="score">
            ○{score.ok} ×{score.ng}
          </span>
        }
      />
      <Banner key={round} text={op.name} kana={op.kana} />

      <div className="board-wrap">
        <Board
          board={pos.board}
          numbers={pos.numbers}
          showNumbers={settings.showNumbers}
          last={pos.last}
          forbidden={pos.forbidden}
          interactive={phase === 'you'}
          onPlay={answer}
          onForbidden={(p) => toast(`禁手（${FOUL_LABEL[foulOf(pos.board, p)!]}）`)}
          ghost={ghost}
          correct={phase === 'wrong' ? ok.map((c) => c.point) : []}
        />
      </div>

      <section className="panel status">
        {phase === 'you' && <p className="turn">あなたの番（{moves.length + 1}手目）</p>}
        {phase === 'opponent' && <p className="muted">相手が考えています…</p>}
        {phase === 'wrong' && (
          <>
            <p className="ng">
              不正解　正解：{ok.map((c) => toCoord(c.point)).join('・')}
            </p>
            {ok[0]?.edge.comment && <p className="comment">{ok[0].edge.comment}</p>}
            <button className="btn primary" onClick={continueMain}>
              正解手で進む
            </button>
          </>
        )}
        {phase === 'done' && (
          <>
            <p className="turn">定石おわり（{moves.length}手）</p>
            {node?.eval && <span className={`eval ${node.eval}`}>{EVAL_LABEL[node.eval]}</span>}
            {node?.note && <p className="note">{node.note}</p>}
            <div className="row2">
              <button className="btn primary" onClick={restart}>
                もう一度
              </button>
              <button className="btn" onClick={() => go({ name: 'list' })}>
                珠型一覧
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
