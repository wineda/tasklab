// ストレージ層（仕様書 §6.4）
// localStorage に AppData 全体を JSON で 1 キー保存。
// 将来 IndexedDB へ移行できるよう loadData() / saveData() に抽象化しておく。

import { STORAGE_KEY } from './constants'
import type { AppData, Run, Settings, Task, HistoryEntry } from './types'

export function emptyData(): AppData {
  return { runs: [], settings: { promptTemplate: '' } }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw)
    return normalizeAppData(parsed)
  } catch {
    return emptyData()
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // 容量超過など。ここでは握りつぶす（UI 側で必要に応じ通知）。
  }
}

// --- スキーマ検証 / 正規化（インポート時にも使用） ---

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function normalizeTask(v: unknown): Task | null {
  if (!isObject(v)) return null
  const name = typeof v.name === 'string' ? v.name : ''
  const estimateMin = Number.isFinite(v.estimateMin as number)
    ? Math.max(0, Math.round(v.estimateMin as number))
    : 0
  let actualMin: number | null = null
  if (v.actualMin === null || v.actualMin === undefined) {
    actualMin = null
  } else if (Number.isFinite(v.actualMin as number)) {
    actualMin = Math.max(0, Math.round(v.actualMin as number))
  }
  const id = typeof v.id === 'string' && v.id ? v.id : randomId()
  return { id, name, estimateMin, actualMin }
}

function normalizeHistory(v: unknown): HistoryEntry | null {
  if (!isObject(v)) return null
  const at = Number.isFinite(v.at as number) ? (v.at as number) : 0
  const comment = typeof v.comment === 'string' ? v.comment : ''
  return { at, comment }
}

function normalizeRun(v: unknown): Run | null {
  if (!isObject(v)) return null
  const id = typeof v.id === 'string' && v.id ? v.id : randomId()
  const name = typeof v.name === 'string' ? v.name : '無題のラン'
  const description = typeof v.description === 'string' ? v.description : ''
  const createdAt = Number.isFinite(v.createdAt as number) ? (v.createdAt as number) : 0
  const tasks = Array.isArray(v.tasks)
    ? v.tasks.map(normalizeTask).filter((t): t is Task => t !== null)
    : []
  const history = Array.isArray(v.history)
    ? v.history.map(normalizeHistory).filter((h): h is HistoryEntry => h !== null)
    : []
  return { id, name, description, createdAt, tasks, history }
}

export function normalizeAppData(v: unknown): AppData {
  if (!isObject(v)) return emptyData()
  const runs = Array.isArray(v.runs)
    ? v.runs.map(normalizeRun).filter((r): r is Run => r !== null)
    : []
  let settings: Settings = { promptTemplate: '' }
  if (isObject(v.settings) && typeof v.settings.promptTemplate === 'string') {
    settings = { promptTemplate: v.settings.promptTemplate }
  }
  return { runs, settings }
}

// インポート時の厳格検証。最低限 AppData の形をしているかを確認する。
export function isValidAppData(v: unknown): boolean {
  if (!isObject(v)) return false
  if (!Array.isArray(v.runs)) return false
  // settings は欠けていても既定で補完するため必須にしない
  return v.runs.every((r) => isObject(r) && Array.isArray((r as Record<string, unknown>).tasks))
}

// --- ID 生成 ---
export function randomId(len = 7): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  const arr = new Uint32Array(len)
  crypto.getRandomValues(arr)
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length]
  return out
}
