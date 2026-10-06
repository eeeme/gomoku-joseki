import { SIZE, parsePos } from '../gomoku/core'

/** 一覧用の小さな盤面（SVG・操作なし）。石のあるあたりを7路以上で切り出して見せる */
export function MiniBoard({ pos: posStr, size = 112 }: { pos: string; size?: number }) {
  const pos = parsePos(posStr)
  let x0 = SIZE, x1 = -1, y0 = SIZE, y1 = -1
  pos.board.forEach((c, i) => {
    if (!c) return
    const x = i % SIZE
    const y = Math.floor(i / SIZE)
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
  })
  if (x1 < 0) { x0 = x1 = y0 = y1 = 7 }
  // 石の範囲＋余白2路、最低7路の正方形
  const span = Math.min(SIZE, Math.max(7, x1 - x0 + 5, y1 - y0 + 5))
  const clamp = (lo: number) => Math.max(0, Math.min(SIZE - span, lo))
  const sx = clamp(Math.round((x0 + x1) / 2 - (span - 1) / 2))
  const sy = clamp(Math.round((y0 + y1) / 2 - (span - 1) / 2))
  const cell = size / span
  const H = size + 14
  const px = (x: number) => (x - sx) * cell + cell / 2
  const py = (y: number) => (sy + span - 1 - y) * cell + cell / 2
  return (
    <svg className="mini-board" width={size} height={H} viewBox={`0 0 ${size} ${H}`} role="img" aria-label="局面">
      <rect x={0} y={0} width={size} height={size} className="mini-bg" />
      {Array.from({ length: span }, (_, i) => (
        <g key={i}>
          <line x1={cell / 2} y1={i * cell + cell / 2} x2={size - cell / 2} y2={i * cell + cell / 2} className="mini-line" />
          <line x1={i * cell + cell / 2} y1={cell / 2} x2={i * cell + cell / 2} y2={size - cell / 2} className="mini-line" />
        </g>
      ))}
      {pos.board.map((c, i) => {
        if (!c) return null
        const x = i % SIZE
        const y = Math.floor(i / SIZE)
        if (x < sx || x >= sx + span || y < sy || y >= sy + span) return null
        return <circle key={i} cx={px(x)} cy={py(y)} r={cell * 0.42} className={c === 1 ? 'mini-black' : 'mini-white'} />
      })}
      <text x={size - 2} y={H - 2} textAnchor="end" className="mini-hand">{pos.turn === 0 ? '黒番' : '白番'}</text>
    </svg>
  )
}
