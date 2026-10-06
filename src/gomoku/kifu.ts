// 棋譜の取り込み・書き出し：棋譜文字列／複数行（変化）／盤面図
import {
  type Cell, type Pos, N, SIZE, START_POS, applyMove, countStones, fiveWinner, illegalReason, isOver, moveToStr,
  parsePos, strToMove, toPosString,
} from './core'
import { colorMark, labelOf, normalizerFor, splitMoves, transformLine } from './notation'
import { openingOfLine } from './openings'
import type { Book, GameMeta, ImportNode, ImportTree } from '../book/book'
import { movesTo, pathTo, positionAt } from '../book/book'

export type KifuFormat = '棋譜文字列' | '複数行' | '盤面図'

export interface ParsedKifu extends ImportTree {
  format: KifuFormat
  /** 標準の向きにそろえるために盤を回したか */
  normalized: boolean
}

// ---------- 手の列 → 木 ----------

/** 局面から手の列を打っていく。打てない手があればエラー（何手目か付き） */
export function playLine(rootPos: string, moves: string[], lineNo?: number): string[] {
  let pos = parsePos(rootPos)
  const out: string[] = []
  const where = lineNo ? `${lineNo}行目の` : ''
  moves.forEach((s, i) => {
    const m = strToMove(s)
    const why = illegalReason(pos, m)
    if (why) throw new Error(`${where}${i + 1}手目 ${labelOf(s)}：${why}`)
    out.push(moveToStr(m))
    pos = applyMove(pos, m)
  })
  return out
}

function addLine(root: ImportNode, moves: string[]) {
  let cur = root
  for (const mv of moves) {
    let ch = cur.children.find((c) => c.move === mv)
    if (!ch) {
      ch = { move: mv, children: [] }
      cur.children.push(ch)
    }
    cur = ch
  }
}

/** 初期配置からの木：手順ごとに標準の向きへ回す（違う向きの同じ手順は1本にまとまる） */
function buildTree(rootPos: string, lines: string[][]): { root: ImportNode; normalized: boolean } {
  const root: ImportNode = { move: null, children: [] }
  let normalized = false
  for (const line of lines) {
    let l = line
    if (rootPos === START_POS) {
      const k = normalizerFor(line)
      if (k) normalized = true
      l = transformLine(line, k)
    }
    addLine(root, l)
  }
  return { root, normalized }
}

// ---------- 形式の判別 ----------

const BOARD_ROW = /^\s*(?:\d{1,2}\s*)?[-XO*.●○xo+]{15}\s*$/

export function detectFormat(text: string): KifuFormat {
  const lines = text.split(/\r?\n/)
  if (lines.filter((l) => BOARD_ROW.test(l)).length >= SIZE) return '盤面図'
  const moveLines = lines.filter((l) => splitMoves(l).length > 0)
  if (moveLines.length > 1) return '複数行'
  if (moveLines.length === 1) return '棋譜文字列'
  throw new Error('棋譜を読み取れません（h8i9j10… の棋譜文字列・盤面図に対応）')
}

export function parseKifu(text: string): ParsedKifu {
  const format = detectFormat(text)
  if (format === '盤面図') return parseDiagram(text)
  const lines = text.split(/\r?\n/).map(splitMoves).filter((l) => l.length > 0)
  let played: string[][]
  let fmt = format
  try {
    played = lines.map((l, i) => playLine(START_POS, l, lines.length > 1 ? i + 1 : undefined))
  } catch (e) {
    // 1局が途中で改行されているだけなら、つなげて1本として読む
    if (lines.length < 2) throw e
    try {
      played = [playLine(START_POS, lines.flat())]
      fmt = '棋譜文字列'
    } catch {
      throw e
    }
  }
  const { root, normalized } = buildTree(START_POS, played)
  const meta = played.length === 1 ? resultMeta(START_POS, played[0]) : undefined
  const name = played.length === 1 ? openingOfLine(START_POS, normalizeFirst(played[0])) : null
  return { format: fmt, rootPos: START_POS, root, normalized, meta, title: name ?? undefined }
}

const normalizeFirst = (l: string[]) => transformLine(l, normalizerFor(l))

/** 五連まで打った棋譜なら勝敗を入れる */
function resultMeta(rootPos: string, moves: string[]): GameMeta | undefined {
  let pos = parsePos(rootPos)
  for (const s of moves) pos = applyMove(pos, strToMove(s))
  const w = fiveWinner(pos)
  if (w === null) return isOver(pos) ? { result: '引き分け' } : undefined
  return { result: w === 0 ? '黒勝ち' : '白勝ち' }
}

/** 終局していれば「黒勝ち（五連）」など */
export function scoreText(pos: Pos): string {
  const w = fiveWinner(pos)
  if (w === null) return '引き分け'
  return `${w === 0 ? '黒' : '白'}の五連`
}

/** 本の勝敗 → 0 = 黒勝ち / 1 = 白勝ち / 'draw' / null（不明） */
export function winnerOf(result: string | undefined): 0 | 1 | 'draw' | null {
  if (!result) return null
  if (result.startsWith('黒勝') || /黒.*五連/.test(result)) return 0
  if (result.startsWith('白勝') || /白.*五連/.test(result)) return 1
  if (result.startsWith('引')) return 'draw'
  return null
}

// ---------- 盤面図（15行。上が15行目、下が1行目） ----------

function parseDiagram(text: string): ParsedKifu {
  const lines = text.split(/\r?\n/)
  const rows = lines.filter((l) => BOARD_ROW.test(l)).slice(0, SIZE)
  const board = new Array<Cell>(N).fill(0)
  rows.forEach((r, i) => {
    const cells = r.trim().replace(/^\d{1,2}\s*/, '')
    const y = SIZE - 1 - i
    ;[...cells].forEach((ch, x) => {
      board[y * SIZE + x] = ch === 'X' || ch === 'x' || ch === '*' || ch === '●' ? 1 : ch === 'O' || ch === 'o' || ch === '○' ? 2 : 0
    })
  })
  const rest = lines.slice(lines.indexOf(rows[SIZE - 1]) + 1).join('\n')
  const { black, white } = countStones({ board, turn: 0 })
  const whiteTurn = /白番|白の番|○番|turn\s*[:：]?\s*(O|white)/im.test(rest) || (!/黒番/.test(rest) && black > white)
  const rootPos = toPosString({ board, turn: whiteTurn ? 1 : 0 })
  const moves = splitMoves(rest.replace(/白番|黒番/g, ''))
  const root: ImportNode = { move: null, children: [] }
  if (moves.length) addLine(root, playLine(rootPos, moves))
  return { format: '盤面図', rootPos, root, normalized: false }
}

/** 取り込み木の本線（先頭の子をたどる） */
export function mainLine(tree: ImportTree): string[] {
  const out: string[] = []
  let cur = tree.root
  while (cur.children[0]) {
    cur = cur.children[0]
    out.push(cur.move!)
  }
  return out
}

// ---------- 書き出し ----------

const lineText = (moves: string[]) => moves.join('')

/** 本線を棋譜文字列で */
export function exportMainLine(book: Book): string {
  let cur = book.nodes[book.rootId]
  const out: string[] = []
  while (cur.children[0]) {
    cur = book.nodes[cur.children[0]]
    out.push(cur.move!)
  }
  return lineText(out)
}

/** 全変化を1行ずつ（末端ごとに1行） */
export function exportAllLines(book: Book): string {
  const order: string[] = []
  const walk = (id: string) => {
    const n = book.nodes[id]
    if (!n.children.length && n.parent) order.push(id)
    n.children.forEach(walk)
  }
  walk(book.rootId)
  const head = book.rootPos === START_POS ? [] : [diagram(parsePos(book.rootPos)), '']
  return [...head, ...order.map((id) => lineText(movesTo(book, id)))].join('\n') + '\n'
}

/** 15行の盤面図（X 黒・O 白・- 空。上が15行目）と手番 */
export function diagram(pos: Pos): string {
  const rows: string[] = []
  for (let r = SIZE - 1; r >= 0; r--) {
    rows.push(pos.board.slice(r * SIZE, r * SIZE + SIZE).map((c) => (c === 1 ? 'X' : c === 2 ? 'O' : '-')).join(''))
  }
  return [...rows, pos.turn === 0 ? '黒番' : '白番'].join('\n')
}

/** AI などに渡すための局面テキスト（盤面図＋ここまでの手順＋メモ） */
export function positionText(book: Book, nodeId: string): string {
  const { pos } = positionAt(book, nodeId)
  const moves = movesTo(book, nodeId)
  const ply = pathTo(book, nodeId).length - 1
  const opening = openingOfLine(book.rootPos, moves)
  const lines = [
    `局面：${book.name}　${ply}手目${moves.length ? `（${labelOf(moves.at(-1)!)}まで）` : '（開始局面）'}${opening ? `　珠型：${opening}` : ''}`,
    ...(book.meta?.black || book.meta?.white ? [`対局者：●${book.meta?.black ?? ''} ○${book.meta?.white ?? ''}`] : []),
    'ルール：連珠（黒に三三・四四・長連の禁手）',
    '',
    '   abcdefghijklmno',
    ...diagram(pos).split('\n').slice(0, SIZE).map((r, i) => `${String(SIZE - i).padStart(2)} ${r}`),
    `${pos.turn === 0 ? '黒' : '白'}番　${colorMark(0)}${countStones(pos).black} ${colorMark(1)}${countStones(pos).white}`,
  ]
  if (moves.length) lines.push('', `手順：${lineText(moves)}`)
  const memo = book.nodes[nodeId].comment
  if (memo) lines.push('', `メモ：${memo}`)
  return lines.join('\n')
}
