// 共通 UI 部品（確認ダイアログ・トースト・Δピル）
import { useEffect } from 'react'
import { COLORS } from '../constants'
import { signStr } from '../metrics'

// --- Δ ピル（一覧・集計で共有）---
export function DeltaPill({ delta, big }: { delta: number | null; big?: boolean }) {
  const c =
    delta == null ? COLORS.gray : delta > 0 ? COLORS.rose : delta < 0 ? COLORS.green : COLORS.inkSoft
  return (
    <span
      className="tl-mono"
      style={{ color: c, fontWeight: 700, fontSize: big ? 30 : 12, lineHeight: 1 }}
    >
      {delta == null ? '—' : `Δ ${signStr(delta)}`}
    </span>
  )
}

// --- モーダルオーバーレイ ---
export function Overlay({
  children,
  onBackdrop,
}: {
  children: React.ReactNode
  onBackdrop?: () => void
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  return (
    <div
      onClick={onBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 30,
        background: 'rgba(30,38,44,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400 }}>
        {children}
      </div>
    </div>
  )
}

// --- 確認ダイアログ ---
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'キャンセル',
  danger,
  onConfirm,
  onCancel,
}: {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Overlay onBackdrop={onCancel}>
      <div
        style={{
          background: COLORS.surface,
          borderRadius: 16,
          boxShadow: '0 20px 50px rgba(30,38,44,.3)',
          padding: 18,
        }}
      >
        <div className="tl-disp" style={{ fontSize: 16, fontWeight: 600, marginBottom: message ? 4 : 14 }}>
          {title}
        </div>
        {message && (
          <p style={{ fontSize: 12.5, color: COLORS.inkSoft, margin: '0 0 14px', lineHeight: 1.6 }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="tl-btn"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '13px',
              border: 'none',
              borderRadius: 10,
              background: danger ? COLORS.rose : COLORS.accent,
              color: '#fff',
              fontSize: 14.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
          <button
            className="tl-btn tl-ghost"
            onClick={onCancel}
            style={{
              padding: '13px 18px',
              border: `1px solid ${COLORS.line}`,
              borderRadius: 10,
              background: '#fff',
              color: COLORS.inkSoft,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

// --- トースト（SW 更新通知など）---
export function Toast({
  message,
  actionLabel,
  onAction,
  onClose,
}: {
  message: string
  actionLabel?: string
  onAction?: () => void
  onClose?: () => void
}) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(20px + env(safe-area-inset-bottom))',
        transform: 'translateX(-50%)',
        background: COLORS.ink,
        color: '#fff',
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
        zIndex: 50,
        maxWidth: 'calc(100% - 32px)',
        fontSize: 14,
      }}
    >
      <span>{message}</span>
      {actionLabel && (
        <button
          className="tl-btn"
          onClick={onAction}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8fc0ef',
            fontWeight: 700,
            fontSize: 14,
            padding: 4,
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
      {onClose && (
        <button
          className="tl-btn"
          onClick={onClose}
          aria-label="閉じる"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 16,
            padding: 4,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
