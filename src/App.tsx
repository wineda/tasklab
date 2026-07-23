import { useCallback, useEffect, useMemo, useState } from 'react'
import { RunList } from './components/RunList'
import { RunDetail } from './components/RunDetail'
import { SettingsView } from './components/SettingsView'
import { ConfirmDialog, Toast } from './components/common'
import { loadData, saveData, randomId } from './storage'
import { onNeedRefresh } from './sw-update'
import type { AppData, Run } from './types'

type View = 'list' | 'detail' | 'settings'

function nextRunName(runs: Run[]): string {
  let max = 0
  for (const r of runs) {
    const m = r.name.match(/(\d+)/g)
    if (m) for (const g of m) max = Math.max(max, parseInt(g, 10))
  }
  return `ラン ${max + 1}`
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [view, setView] = useState<View>('list')
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [updateReload, setUpdateReload] = useState<(() => void) | null>(null)

  // 変更のたびに永続化
  const commit = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev)
      saveData(next)
      return next
    })
  }, [])

  // SW 更新通知
  useEffect(() => {
    onNeedRefresh((reload) => setUpdateReload(() => reload))
  }, [])

  const currentRun = useMemo(
    () => data.runs.find((r) => r.id === currentId) ?? null,
    [data.runs, currentId],
  )

  // 詳細表示中に対象が消えたら一覧へ
  useEffect(() => {
    if (view === 'detail' && !currentRun) setView('list')
  }, [view, currentRun])

  // --- ラン操作 ---
  const createRun = () => {
    const run: Run = {
      id: randomId(),
      name: nextRunName(data.runs),
      description: '',
      createdAt: Date.now(),
      tasks: [],
      history: [],
    }
    commit((prev) => ({ ...prev, runs: [run, ...prev.runs] }))
    setCurrentId(run.id)
    setView('detail')
  }

  const duplicateRun = (id: string, open: boolean) => {
    const src = data.runs.find((r) => r.id === id)
    if (!src) return
    const copy: Run = {
      id: randomId(),
      name: `${src.name} のコピー`,
      description: src.description,
      createdAt: Date.now(),
      // タスク構成を引き継ぎ、実測はすべて空にする（再挑戦用）。履歴は引き継がない。
      tasks: src.tasks.map((t) => ({ ...t, id: randomId(), actualMin: null })),
      history: [],
    }
    commit((prev) => ({ ...prev, runs: [copy, ...prev.runs] }))
    if (open) {
      setCurrentId(copy.id)
      setView('detail')
    }
  }

  const deleteRun = (id: string) => {
    commit((prev) => ({ ...prev, runs: prev.runs.filter((r) => r.id !== id) }))
    if (currentId === id) {
      setCurrentId(null)
      setView('list')
    }
  }

  const saveRun = (updated: Run) => {
    commit((prev) => ({
      ...prev,
      runs: prev.runs.map((r) => (r.id === updated.id ? updated : r)),
    }))
  }

  const savePrompt = (template: string) => {
    commit((prev) => ({ ...prev, settings: { ...prev.settings, promptTemplate: template } }))
  }

  const importData = (imported: AppData) => {
    saveData(imported)
    setData(imported)
    setCurrentId(null)
    setView('list')
  }

  return (
    <>
      {view === 'list' && (
        <RunList
          runs={data.runs}
          onOpen={(id) => {
            setCurrentId(id)
            setView('detail')
          }}
          onNew={createRun}
          onDuplicate={(id) => duplicateRun(id, false)}
          onDelete={(id) => setPendingDeleteId(id)}
          onOpenSettings={() => setView('settings')}
        />
      )}

      {view === 'detail' && currentRun && (
        <RunDetail
          key={currentRun.id}
          savedRun={currentRun}
          promptTemplate={data.settings.promptTemplate}
          onSave={(updated) => saveRun(updated)}
          onDuplicate={() => duplicateRun(currentRun.id, true)}
          onDelete={() => deleteRun(currentRun.id)}
          onBack={() => setView('list')}
        />
      )}

      {view === 'settings' && (
        <SettingsView
          promptTemplate={data.settings.promptTemplate}
          onSavePrompt={savePrompt}
          getData={() => data}
          onImport={importData}
          onBack={() => setView('list')}
        />
      )}

      {/* 一覧からの削除確認 */}
      {pendingDeleteId && (
        <ConfirmDialog
          title="このランを削除しますか？"
          message="この操作は取り消せません。"
          confirmLabel="削除する"
          danger
          onConfirm={() => {
            deleteRun(pendingDeleteId)
            setPendingDeleteId(null)
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {/* SW 更新トースト */}
      {updateReload && (
        <Toast
          message="新しいバージョンがあります"
          actionLabel="再読み込み"
          onAction={updateReload}
          onClose={() => setUpdateReload(null)}
        />
      )}
    </>
  )
}
