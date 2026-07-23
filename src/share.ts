// 共有 / コピー（仕様書 §4.5）

export function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export async function sharePrompt(title: string, text: string): Promise<boolean> {
  if (!canShare()) return false
  try {
    await navigator.share({ title, text })
    return true
  } catch {
    // ユーザーキャンセルや失敗
    return false
  }
}

// clipboard.writeText、失敗時は textarea + execCommand('copy') にフォールバック。
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // フォールバックへ
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    ta.setAttribute('readonly', '')
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
