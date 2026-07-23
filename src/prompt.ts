// プロンプト生成（仕様書 §4.5）

import { DEFAULT_PROMPT } from './constants'
import type { Run } from './types'

export interface RunDataJson {
  run_name: string
  description: string
  tasks: { name: string; estimate_min: number; actual_min: number | null }[]
}

export function buildRunData(run: Run): RunDataJson {
  return {
    run_name: run.name,
    description: run.description,
    tasks: run.tasks.map((t) => ({
      name: t.name,
      estimate_min: t.estimateMin,
      actual_min: t.actualMin,
    })),
  }
}

// 有効なテンプレート（設定が空文字なら既定を使用）。
export function effectiveTemplate(promptTemplate: string): string {
  return promptTemplate.trim() ? promptTemplate : DEFAULT_PROMPT
}

// テンプレートの {{DATA}} を JSON で置換。無ければ末尾に追記。
export function buildPrompt(run: Run, promptTemplate: string): string {
  const template = effectiveTemplate(promptTemplate)
  const json = JSON.stringify(buildRunData(run), null, 2)
  if (template.includes('{{DATA}}')) {
    return template.split('{{DATA}}').join(json)
  }
  return `${template}\n\n【データ】\n${json}`
}
