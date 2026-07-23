// TaskLab データモデル（仕様書 §5）

export interface Task {
  id: string // ランダム 7 文字
  name: string
  estimateMin: number // 見積もり（分）
  actualMin: number | null // 実測（分）。null = 未計測
}

export interface HistoryEntry {
  at: number // epoch ms
  comment: string // 変更理由（必須）
}

export interface Run {
  id: string
  name: string
  description: string
  createdAt: number // epoch ms
  tasks: Task[]
  history: HistoryEntry[]
}

export interface Settings {
  promptTemplate: string // 空文字 = 既定プロンプトを使用
}

export interface AppData {
  runs: Run[] // 新しい順
  settings: Settings
}
