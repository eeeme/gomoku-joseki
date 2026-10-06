import { useEffect, useMemo, useRef, useState } from 'react'
import { BLACK, COLS, SIZE, WHITE, samePoint, type Point } from '../lib/coord'
import { sideToMove, type Board as BoardData } from '../lib/rules'

const CELL = 40
const M = 30
const W = M * 2 + CELL * (SIZE - 1)
const px = (x: number) => M + x * CELL
const py = (y: number) => M + (SIZE - 1 - y) * CELL
const STARS: Point[] = [
  { x: 3, y: 3 },
  { x: 11, y: 3 },
  { x: 7, y: 7 },
  { x: 3, y: 11 },
  { x: 11, y: 11 },
]

export interface CandidateMark {
  point: Point
  label: string
  main?: boolean
}

export interface BoardProps {
  board: BoardData
  /** 盤上の石の手数（index → 手数） */
  numbers?: Map<number, number>
  showNumbers?: boolean
  last?: Point | null
  forbidden?: Point[]
  candidates?: CandidateMark[]
  /** 正解手の強調表示 */
  correct?: Point[]
  /** 不正解だった手（半透明で表示） */
  ghost?: Point | null
  interactive?: boolean
  /** 仮置きせず1タップで確定する */
  instant?: boolean
  onPlay?: (p: Point) => void
  onForbidden?: (p: Point) => void
}

export default function Board({
  board,
  numbers,
  showNumbers = true,
  last,
  forbidden = [],
  candidates = [],
  correct = [],
  ghost,
  interactive = false,
  instant = false,
  onPlay,
  onForbidden,
}: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [preview, setPreview] = useState<Point | null>(null)
  const turn = sideToMove(board)

  // 盤が変わったら仮置きを消す
  useEffect(() => setPreview(null), [board])

  const stones = useMemo(() => {
    const res: { p: Point; c: number; n?: number }[] = []
    board.forEach((c, i) => {
      if (c) res.push({ p: { x: i % SIZE, y: Math.floor(i / SIZE) }, c, n: numbers?.get(i) })
    })
    return res
  }, [board, numbers])

  function handleTap(e: React.PointerEvent<SVGSVGElement>) {
    if (!interactive || !svgRef.current) return
    const r = svgRef.current.getBoundingClientRect()
    const vx = ((e.clientX - r.left) / r.width) * W
    const vy = ((e.clientY - r.top) / r.height) * W
    const x = Math.round((vx - M) / CELL)
    const y = SIZE - 1 - Math.round((vy - M) / CELL)
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return
    const p = { x, y }
    if (board[y * SIZE + x]) return
    if (turn === BLACK && forbidden.some((f) => samePoint(f, p))) {
      setPreview(null)
      onForbidden?.(p)
      return
    }
    // タップで仮置き → 同じ点をもう一度タップで確定（instant のときは1タップ）
    if (instant || samePoint(preview, p)) {
      setPreview(null)
      onPlay?.(p)
    } else setPreview(p)
  }

  const r = CELL * 0.46
  return (
    <svg
      ref={svgRef}
      className="board"
      viewBox={`0 0 ${W} ${W}`}
      onPointerDown={handleTap}
      role="img"
      aria-label="連珠盤"
    >
      <defs>
        <radialGradient id="gB" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#5a5a5a" />
          <stop offset="100%" stopColor="#0d0d0d" />
        </radialGradient>
        <radialGradient id="gW" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cfcac0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={W} height={W} rx="10" className="board-bg" />
      {Array.from({ length: SIZE }, (_, i) => (
        <g key={i} className="grid">
          <line x1={px(0)} y1={py(i)} x2={px(SIZE - 1)} y2={py(i)} />
          <line x1={px(i)} y1={py(0)} x2={px(i)} y2={py(SIZE - 1)} />
          <text x={px(i)} y={W - 8} className="label">
            {COLS[i]}
          </text>
          <text x={12} y={py(i) + 4} className="label">
            {i + 1}
          </text>
        </g>
      ))}
      {STARS.map((s, i) => (
        <circle key={i} cx={px(s.x)} cy={py(s.y)} r={3.5} className="star" />
      ))}

      {turn === BLACK &&
        forbidden.map((f, i) => (
          <g key={`f${i}`} className="foul">
            <line x1={px(f.x) - 8} y1={py(f.y) - 8} x2={px(f.x) + 8} y2={py(f.y) + 8} />
            <line x1={px(f.x) + 8} y1={py(f.y) - 8} x2={px(f.x) - 8} y2={py(f.y) + 8} />
          </g>
        ))}

      {stones.map(({ p, c, n }) => (
        <g key={`${p.x},${p.y}`}>
          <circle cx={px(p.x)} cy={py(p.y)} r={r} fill={c === BLACK ? 'url(#gB)' : 'url(#gW)'} className="stone" />
          {showNumbers && n !== undefined && (
            <text
              x={px(p.x)}
              y={py(p.y) + 6}
              className={`num ${c === BLACK ? 'on-black' : 'on-white'} ${samePoint(last, p) ? 'is-last' : ''}`}
            >
              {n}
            </text>
          )}
          {samePoint(last, p) && !(showNumbers && n !== undefined) && (
            <circle cx={px(p.x)} cy={py(p.y)} r={5} className="last-dot" />
          )}
        </g>
      ))}

      {candidates.map((c) => (
        <g key={`c${c.point.x},${c.point.y}`} className={`cand ${c.main ? 'main' : ''}`}>
          <circle cx={px(c.point.x)} cy={py(c.point.y)} r={r * 0.78} />
          <text x={px(c.point.x)} y={py(c.point.y) + 6}>
            {c.label}
          </text>
        </g>
      ))}

      {correct.map((c, i) => (
        <circle key={`ok${i}`} cx={px(c.x)} cy={py(c.y)} r={r} className="correct-ring" />
      ))}

      {ghost && (
        <g className="ghost">
          <circle cx={px(ghost.x)} cy={py(ghost.y)} r={r} fill={turn === BLACK ? '#111' : '#eee'} />
          <line x1={px(ghost.x) - 9} y1={py(ghost.y) - 9} x2={px(ghost.x) + 9} y2={py(ghost.y) + 9} />
          <line x1={px(ghost.x) + 9} y1={py(ghost.y) - 9} x2={px(ghost.x) - 9} y2={py(ghost.y) + 9} />
        </g>
      )}

      {preview && (
        <g className="preview">
          <circle cx={px(preview.x)} cy={py(preview.y)} r={r} fill={turn === WHITE ? '#f4f1ea' : '#111'} />
          <circle cx={px(preview.x)} cy={py(preview.y)} r={r + 5} className="preview-ring" />
        </g>
      )}
    </svg>
  )
}

/** 珠型一覧用の小盤面（中央 7×7 を切り出し） */
export function MiniBoard({ moves }: { moves: Point[] }) {
  const R = 3
  const C = 22
  const w = C * (R * 2) + 20
  const mx = (x: number) => 10 + (x - (7 - R)) * C
  const my = (y: number) => 10 + (7 + R - y) * C
  return (
    <svg viewBox={`0 0 ${w} ${w}`} className="mini">
      <rect width={w} height={w} rx="6" className="board-bg" />
      {Array.from({ length: R * 2 + 1 }, (_, i) => (
        <g key={i} className="grid">
          <line x1={mx(7 - R)} y1={my(7 - R + i)} x2={mx(7 + R)} y2={my(7 - R + i)} />
          <line x1={mx(7 - R + i)} y1={my(7 - R)} x2={mx(7 - R + i)} y2={my(7 + R)} />
        </g>
      ))}
      {moves.map((p, i) => (
        <circle
          key={i}
          cx={mx(p.x)}
          cy={my(p.y)}
          r={C * 0.44}
          fill={i % 2 === 0 ? '#111' : '#f4f1ea'}
          stroke="#00000055"
        />
      ))}
    </svg>
  )
}
