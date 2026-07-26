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
  // 並行グループ（所要時間 / クリティカルパス）
  hasParallel: boolean // 並行グループ（2 件以上のグループ）が存在するか
  planDuration: number // 計画の所要時間 = Σ_group max(estimate)
  actualDuration: number // 実測の所要時間 = Σ_group max(計測済み actual)（未計測グループは 0）
}

// セクション見出し行かどうか
export function isSection(t: Task): boolean {
  return t.kind === 'section'
}

// タスク単位の Δ（実測入力済みのみ）。未計測は null。
export function taskDelta(t: Task): number | null {
  if (t.actualMin === null) return null
  return t.actualMin - t.estimateMin
}

// 連続する「並行」タスクを 1 グループにまとめる。
// セクション行はグループの境界（並行チェーンはセクションをまたがない）。
export function computeGroups(tasks: Task[]): Task[][] {
  const groups: Task[][] = []
  let prevWasTask = false
  for (const t of tasks) {
    if (isSection(t)) {
      prevWasTask = false
      continue
    }
    if (!prevWasTask || !t.parallel) groups.push([t])
    else groups[groups.length - 1].push(t)
    prevWasTask = true
  }
  return groups
}

// ガントチャート用スケジュール算出。
// タスクは記載順に直列、並行グループは同時開始。グループの所要は最長メンバー。
// 計画タイムラインと実測タイムラインを別々に進める（実測は計測済みのみ寄与）。
export interface GanttRow {
  kind: 'section' | 'task'
  task: Task
  planStart: number
  planDur: number
  actualStart: number | null // 未計測タスクは null（バーなし）
  actualDur: number | null
}

export interface Schedule {
  rows: GanttRow[]
  planEnd: number
  actualEnd: number
}

export function computeSchedule(tasks: Task[]): Schedule {
  const rows: GanttRow[] = []
  let planCursor = 0
  let actualCursor = 0
  let group: { planMax: number; actualMax: number } | null = null

  const flush = () => {
    if (group) {
      planCursor += group.planMax
      actualCursor += group.actualMax
      group = null
    }
  }

  for (const t of tasks) {
    if (isSection(t)) {
      flush()
      rows.push({ kind: 'section', task: t, planStart: planCursor, planDur: 0, actualStart: null, actualDur: null })
      continue
    }
    if (!group || !t.parallel) {
      flush()
      group = { planMax: 0, actualMax: 0 }
    }
    rows.push({
      kind: 'task',
      task: t,
      planStart: planCursor,
      planDur: t.estimateMin,
      actualStart: t.actualMin != null ? actualCursor : null,
      actualDur: t.actualMin,
    })
    group.planMax = Math.max(group.planMax, t.estimateMin)
    if (t.actualMin != null) group.actualMax = Math.max(group.actualMax, t.actualMin)
  }
  flush()

  return { rows, planEnd: planCursor, actualEnd: actualCursor }
}

// セクション毎の合計（セクション行の id → 集計）。
// セクション行より前のタスク（未分類）は含まれない。
export interface SectionTotals {
  count: number // タスク数
  measured: number // 計測済みタスク数
  plan: number // 計画合計
  actual: number // 実測合計（計測済みのみ）
  delta: number // Σ(actual − estimate)（計測済みのみ）
}

export function computeSectionTotals(tasks: Task[]): Record<string, SectionTotals> {
  const map: Record<string, SectionTotals> = {}
  let cur: SectionTotals | null = null
  for (const t of tasks) {
    if (isSection(t)) {
      cur = { count: 0, measured: 0, plan: 0, actual: 0, delta: 0 }
      map[t.id] = cur
      continue
    }
    if (!cur) continue
    cur.count += 1
    cur.plan += t.estimateMin
    if (t.actualMin !== null) {
      cur.measured += 1
      cur.actual += t.actualMin
      cur.delta += t.actualMin - t.estimateMin
    }
  }
  return map
}

export function computeMetrics(run: Run): RunMetrics {
  const tasks = run.tasks
  let measuredCount = 0
  let planTotal = 0
  let planTotalMeasured = 0
  let actualTotal = 0
  let delta = 0
  let absSum = 0

  let realCount = 0
  for (const t of tasks) {
    if (isSection(t)) continue
    realCount += 1
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

  // 並行グループを考慮した所要時間（クリティカルパス）
  const groups = computeGroups(tasks)
  const hasParallel = groups.some((g) => g.length > 1)
  let planDuration = 0
  let actualDuration = 0
  for (const g of groups) {
    planDuration += Math.max(0, ...g.map((t) => t.estimateMin))
    const measured = g.filter((t) => t.actualMin !== null) as Array<Task & { actualMin: number }>
    if (measured.length) actualDuration += Math.max(...measured.map((t) => t.actualMin))
  }

  return {
    measuredCount,
    totalCount: realCount,
    planTotal,
    planTotalMeasured,
    actualTotal,
    delta,
    absSum,
    avgAbs,
    deltaPct,
    absPct,
    hasCancellation,
    hasParallel,
    planDuration,
    actualDuration,
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
