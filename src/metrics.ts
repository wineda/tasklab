// 指標の算出（仕様書 §4.6）

import type { Run, Task } from './types'

export interface RunMetrics {
  measuredCount: number // 計測済みタスク数
  totalCount: number
  planTotal: number // 全タスクの計画合計
  planTotalMeasured: number // 計測済みタスクの計画合計
  actualTotal: number // 計測済みタスクの実測合計
  delta: number // Δ 合計 = Σ(actual − estimate)（計測済みのみ）
  absSum: number // Σ|Δ|（計測済みのみ）
  avgAbs: number // 平均 |Δ| = Σ|Δ| ÷ 計測済み数
  deltaPct: number | null // 計画比 %（Δ 行）
  absPct: number | null // 計画比 %（ばらつき行）
  hasCancellation: boolean // Δ=0 だが Σ|Δ|>0（相殺）
}

// タスク単位の Δ（実測入力済みのみ）。未計測は null。
export function taskDelta(t: Task): number | null {
  if (t.actualMin === null) return null
  return t.actualMin - t.estimateMin
}

export function computeMetrics(run: Run): RunMetrics {
  const tasks = run.tasks
  let measuredCount = 0
  let planTotal = 0
  let planTotalMeasured = 0
  let actualTotal = 0
  let delta = 0
  let absSum = 0

  for (const t of tasks) {
    planTotal += t.estimateMin
    if (t.actualMin !== null) {
      measuredCount += 1
      planTotalMeasured += t.estimateMin
      actualTotal += t.actualMin
      const d = t.actualMin - t.estimateMin
      delta += d
      absSum += Math.abs(d)
    }
  }

  const avgAbs = measuredCount > 0 ? absSum / measuredCount : 0
  const deltaPct = planTotalMeasured > 0 ? (actualTotal / planTotalMeasured) * 100 : null
  const absPct = planTotalMeasured > 0 ? (absSum / planTotalMeasured) * 100 : null
  const hasCancellation = delta === 0 && absSum > 0

  return {
    measuredCount,
    totalCount: tasks.length,
    planTotal,
    planTotalMeasured,
    actualTotal,
    delta,
    absSum,
    avgAbs,
    deltaPct,
    absPct,
    hasCancellation,
  }
}

// ラン内 max(計画, 実測) を 100% としたバー相対長（最小 2%）。
export function barMax(run: Run): number {
  let m = 0
  for (const t of run.tasks) {
    m = Math.max(m, t.estimateMin)
    if (t.actualMin !== null) m = Math.max(m, t.actualMin)
  }
  return m
}

export function barPct(value: number, max: number): number {
  if (max <= 0) return 2
  return Math.max(2, (value / max) * 100)
}

// 時間表記: 60 分未満は `Nm`、60 分以上は `Nh Mm`（0 分は省略）。
export function fmtDuration(min: number): string {
  const v = Math.round(min)
  if (v < 60) return `${v}m`
  const h = Math.floor(v / 60)
  const m = v % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// 符号付き表示: `+`/`-` を前置。
export function fmtSigned(min: number): string {
  const v = Math.round(min)
  if (v === 0) return '±0m'
  const sign = v > 0 ? '+' : '-'
  return `${sign}${fmtDuration(Math.abs(v))}`
}

export function fmtPct(pct: number): string {
  return `${Math.round(pct)}%`
}

// モック TaskLabV10 準拠の表記ヘルパー
// null は「—」。60 分以上は `Nh Mm`、未満は `Nm`。負値は先頭に「-」。
export function fmt(m: number | null): string {
  if (m == null || Number.isNaN(m)) return '—'
  const s = m < 0 ? '-' : ''
  const a = Math.abs(Math.round(m))
  const h = Math.floor(a / 60)
  const mm = a % 60
  if (h && mm) return `${s}${h}h ${mm}m`
  if (h) return `${s}${h}h`
  return `${s}${mm}m`
}

// 符号付き（正のときのみ `+` を前置。負は fmt が `-` を持つ）。
export function signStr(m: number): string {
  return (Math.round(m) > 0 ? '+' : '') + fmt(m)
}
