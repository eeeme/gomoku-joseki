import { useEffect, useMemo, useRef, useState } from 'react'
import { type Move, type Pos, FILES, PASS, SIZE, colOf, countStones, forbiddenPoints, illegalReason, rowOf, sqAt } from '../gomoku/core'

interface Props {
  pos: Pos
  /** 盤を180度回して見る */
  flipped?: boolean
  last?: Move | null
  hint?: Move | null
  /** 石の上に出す手数（マス → 手数） */
  numbers?: Map<number, number>
  /** 石を隠す（脳内盤）。直前の手の点だけ光らせる */
  hideStones?: boolean
  interactive?: boolean
  onMove?: (m: Move) => void
  /** 打てない点をタップしたとき（理由つき） */
  onIllegal?: (reason: string) => void
  /** 参照用：指定すると盤のタップは手ではなく、盤の左右どちら側かを渡す */
  onTapSide?: (side: 'left' | 'right') => void
  /** 盤面編集用：ルールを使わず、タップした点をそのまま渡す */
  onEditSquare?: (sq: number) => void
}

const C = 40 // 1路の幅（viewBox 上）
const M = 22 // 外周の余白
const W = M * 2 + C * (SIZE - 1)
const STARS = [sqAt(3, 3), sqAt(11, 3), sqAt(7, 7), sqAt(3, 11), sqAt(11, 11)]

/**
 * 15路盤。線の交点に石を置く。
 * 15路はスマホだと1路が狭いので、手を打つときは「タップで仮置き → 同じ点をもう一度タップで確定」。
 */
export function Board({
  pos, flipped = false, last, hint, numbers, hideStones, interactive = true, onMove, onIllegal, onTapSide, onEditSquare,
}: Props) {
  const ref = useRef<SVGSVGElement>(null)
  const [preview, setPreview] = useState<number | null>(null)
  useEffect(() => setPreview(null), [pos])
  const { black, white } = countStones(pos)
  // 黒番の禁手点は常に×で出す（石を隠す練習中と盤面編集では出さない）
  const fouls = useMemo(
    () => (onEditSquare || hideStones ? [] : forbiddenPoints(pos)),
    [pos, onEditSquare, hideStones],
  )

  // 表示上の座標（左上が 0,0）
  const vx = (sq: number) => M + C * (flipped ? SIZE - 1 - colOf(sq) : colOf(sq))
  const vy = (sq: number) => M + C * (flipped ? rowOf(sq) : SIZE - 1 - rowOf(sq))

  const tap = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = ref.current!.getBoundingClientRect()
    if (onTapSide && !onEditSquare) return onTapSide(e.clientX < r.left + r.width / 2 ? 'left' : 'right')
    const px = ((e.clientX - r.left) / r.width) * (W + 18) - 18
    const py = ((e.clientY - r.top) / r.height) * (W + 16)
    const dc = Math.round((px - M) / C) // 表示上の列
    const dr = Math.round((py - M) / C) // 表示上の行（上が0）
    if (dc < 0 || dc >= SIZE || dr < 0 || dr >= SIZE) return
    const sq = flipped ? sqAt(SIZE - 1 - dc, dr) : sqAt(dc, SIZE - 1 - dr)
    if (onEditSquare) return onEditSquare(sq)
    if (!interactive || !onMove) return
    const why = illegalReason(pos, sq)
    if (why) {
      setPreview(null)
      if (!pos.board[sq]) onIllegal?.(why)
      return
    }
    if (preview === sq) {
      setPreview(null)
      onMove(sq)
    } else setPreview(sq)
  }

  const cols = flipped ? [...FILES].reverse() : [...FILES]
  const rows = Array.from({ length: SIZE }, (_, i) => (flipped ? i + 1 : SIZE - i))
  const lastSq = last !== null && last !== undefined && last !== PASS ? last : null
  const r = C * 0.46

  return (
    <div className="board-wrap">
      <div className="score">
        <span className={`score-side ${pos.turn === 0 ? 'turn' : ''}`}><i className="disc black" />黒 <b>{hideStones ? '–' : black}</b></span>
        <span className={`score-side ${pos.turn === 1 ? 'turn' : ''}`}><i className="disc white" />白 <b>{hideStones ? '–' : white}</b></span>
      </div>
      <svg
        ref={ref}
        className={`board goban ${hideStones ? 'blind' : ''}`}
        viewBox={`-18 0 ${W + 18} ${W + 16}`}
        onPointerDown={tap}
        role="img"
        aria-label="15路盤"
      >
        <rect x={0} y={0} width={W} height={W} className="goban-bg" />
        {Array.from({ length: SIZE }, (_, i) => (
          <g key={i}>
            <line x1={M} y1={M + C * i} x2={W - M} y2={M + C * i} className={`goban-line ${i === 0 || i === SIZE - 1 ? 'edge' : ''}`} />
            <line x1={M + C * i} y1={M} x2={M + C * i} y2={W - M} className={`goban-line ${i === 0 || i === SIZE - 1 ? 'edge' : ''}`} />
            <text x={M + C * i} y={W + 13} className="goban-label">{cols[i]}</text>
            <text x={-8} y={M + C * i + 4} className="goban-label">{rows[i]}</text>
          </g>
        ))}
        {STARS.map((s) => <circle key={s} cx={vx(s)} cy={vy(s)} r={3.6} className="goban-star" />)}

        {fouls.map((s) => (
          <g key={`f${s}`} className="goban-foul">
            <line x1={vx(s) - 7} y1={vy(s) - 7} x2={vx(s) + 7} y2={vy(s) + 7} />
            <line x1={vx(s) + 7} y1={vy(s) - 7} x2={vx(s) - 7} y2={vy(s) + 7} />
          </g>
        ))}

        {!hideStones && pos.board.map((c, sq) => {
          if (!c) return null
          const n = numbers?.get(sq)
          return (
            <g key={sq}>
              <circle cx={vx(sq)} cy={vy(sq)} r={r} className={`goban-stone ${c === 1 ? 'black' : 'white'}`} />
              {n !== undefined && (
                <text x={vx(sq)} y={vy(sq) + 5.5} className={`goban-num ${c === 1 ? 'on-black' : 'on-white'} ${sq === lastSq ? 'last' : ''}`}>{n}</text>
              )}
              {sq === lastSq && n === undefined && <circle cx={vx(sq)} cy={vy(sq)} r={5} className="goban-last" />}
            </g>
          )
        })}
        {hideStones && lastSq !== null && <circle cx={vx(lastSq)} cy={vy(lastSq)} r={r} className="goban-blind-last" />}

        {hint !== null && hint !== undefined && hint !== PASS && (
          <circle cx={vx(hint)} cy={vy(hint)} r={r + 1} className="goban-hint" />
        )}
        {preview !== null && (
          <g className="goban-preview">
            <circle cx={vx(preview)} cy={vy(preview)} r={r} className={`goban-stone ${pos.turn === 0 ? 'black' : 'white'}`} />
            <circle cx={vx(preview)} cy={vy(preview)} r={r + 5} className="goban-preview-ring" />
          </g>
        )}
      </svg>
    </div>
  )
}
