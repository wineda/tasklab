// プロンプト生成（仕様書 §4.5）

import { DEFAULT_PROMPT } from './constants'
import type { Run } from './types'

export interface RunTaskJson {
  name: string
  estimate_min: number
  actual_min: number | null
  parallel_with_prev?: boolean // 直前のタスクと並行（並行グループがある場合のみ付与）
  section?: string | null // 属するセクション名（セクションがある場合のみ付与）
}

export interface RunDataJson {
  run_name: string
  description: string
  tasks: RunTaskJson[]
}

export function buildRunData(run: Run): RunDataJson {
  // 並行グループ / セクションが使われている場合のみ、それぞれのフィールドを含める
  const hasParallel = run.tasks.some((t, i) => i > 0 && t.parallel)
  const hasSections = run.tasks.some((t) => t.kind === 'section')
  const out: RunTaskJson[] = []
  let currentSection: string | null = null
  let prevWasTask = false
  for (const t of run.tasks) {
    if (t.kind === 'section') {
      currentSection = t.name
      prevWasTask = false
      continue
    }
    const task: RunTaskJson = {
      name: t.name,
      estimate_min: t.estimateMin,
      actual_min: t.actualMin,
    }
    if (hasParallel) task.parallel_with_prev = prevWasTask && !!t.parallel
    if (hasSections) task.section = currentSection
    out.push(task)
    prevWasTask = true
  }
  return {
    run_name: run.name,
    description: run.description,
    tasks: out,
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
