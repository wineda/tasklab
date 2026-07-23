// 共通 UI 部品（確認ダイアログ・トースト・アイコン）
import { useEffect } from 'react'
import { COLORS } from '../constants'

// --- モーダル系オーバーレイ ---
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
        background: 'rgba(20,28,24,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 100,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 420 }}>
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
          padding: 20,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: message ? 8 : 16 }}>{title}</div>
        {message && (
          <div style={{ fontSize: 14, color: COLORS.inkSoft, marginBottom: 18, lineHeight: 1.6 }}>
            {message}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={btnGhost}>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              ...btnSolid,
              background: danger ? COLORS.rose : COLORS.accent,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

// --- トースト（更新通知など） ---
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
        zIndex: 200,
        maxWidth: 'calc(100% - 32px)',
        fontSize: 14,
      }}
    >
      <span>{message}</span>
      {actionLabel && (
        <button
          onClick={onAction}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8Fc0ef',
            fontWeight: 700,
            fontSize: 14,
            padding: 4,
          }}
        >
          {actionLabel}
        </button>
      )}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="閉じる"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 16,
            padding: 4,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

// --- 共有ボタン等スタイル ---
export const btnSolid: React.CSSProperties = {
  background: COLORS.accent,
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '10px 16px',
  fontWeight: 700,
  fontSize: 14,
  minHeight: 40,
}

export const btnGhost: React.CSSProperties = {
  background: 'transparent',
  color: COLORS.inkSoft,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 10,
  padding: '10px 16px',
  fontWeight: 600,
  fontSize: 14,
  minHeight: 40,
}
