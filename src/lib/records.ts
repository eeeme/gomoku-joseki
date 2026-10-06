// 学習記録（間隔反復）
export interface StudyRecord {
  positionId: string
  side: 'black' | 'white'
  attempts: number
  misses: number
  lastCorrectAt: number | null
  nextDueAt: number
  /** 連続正解数（間隔の段階） */
  streak: number
  /** 直近に出題したときの手順（表示座標） */
  path: string[]
  openingId: string
}

const DAY = 24 * 60 * 60 * 1000
const INTERVALS = [1, 3, 7, 14, 30, 60] // 日

export function recordAnswer(
  prev: StudyRecord | undefined,
  base: Pick<StudyRecord, 'positionId' | 'side' | 'path' | 'openingId'>,
  correct: boolean,
  now = Date.now(),
): StudyRecord {
  const r: StudyRecord = prev
    ? { ...prev, path: base.path, openingId: base.openingId }
    : { ...base, attempts: 0, misses: 0, lastCorrectAt: null, nextDueAt: now, streak: 0 }
  r.attempts++
  if (correct) {
    r.lastCorrectAt = now
    r.nextDueAt = now + INTERVALS[Math.min(r.streak, INTERVALS.length - 1)] * DAY
    r.streak++
  } else {
    r.misses++
    r.streak = 0
    r.nextDueAt = now
  }
  return r
}

/** 復習対象：一度でも間違えた局面のうち期日が来たもの。間違いが多く、正解が古いものから。 */
export function reviewQueue(records: StudyRecord[], now = Date.now()): StudyRecord[] {
  return records
    .filter((r) => r.misses > 0 && r.nextDueAt <= now)
    .sort((a, b) => b.misses - a.misses || (a.lastCorrectAt ?? 0) - (b.lastCorrectAt ?? 0))
}

/** 習得済み：直近の回答が正解の局面 */
export const isMastered = (r: StudyRecord | undefined) => !!r && r.streak > 0
