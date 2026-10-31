// Telegram WebApp SDK — yengil integratsiya.
// SDK yuklanmagan bo'lsa (oddiy brauzer) ilova to'liq ishlayveradi.
interface TgInsets { top: number; bottom: number; left: number; right: number }

interface TgWebApp {
  ready: () => void
  expand: () => void
  setHeaderColor?: (c: string) => void
  setBackgroundColor?: (c: string) => void
  requestFullscreen?: () => void
  isFullscreen?: boolean
  safeAreaInset?: TgInsets
  contentSafeAreaInset?: TgInsets
  onEvent?: (event: string, cb: () => void) => void
  BackButton: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void }
  initData?: string
}

export function tg(): TgWebApp | undefined {
  return (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp
}

export function inTelegram(): boolean {
  const w = tg()
  return !!w && typeof w.initData === 'string' && w.initData.length > 0
}

const ZERO: TgInsets = { top: 0, bottom: 0, left: 0, right: 0 }

/**
 * Safe-area insetlarni CSS o'zgaruvchilarga yozadi (--tg-inset-top/bottom).
 * Fullscreen rejimda Telegram tugmalari (X / ⋮) kontent USTIDA suzib turadi:
 * kerakli bo'shliq = qurilma safe-area + Telegram UI content inset.
 * Oddiy rejimda inset 0 — Telegram paneli o'zi joy ajratadi, layout o'zgarmaydi.
 */
function syncInsets(w: TgWebApp) {
  const root = document.documentElement
  const safe = w.safeAreaInset ?? ZERO
  const content = w.contentSafeAreaInset ?? ZERO
  const fs = !!w.isFullscreen
  const top = fs ? (safe.top || 0) + (content.top || 0) : 0
  const bottom = fs ? (safe.bottom || 0) + (content.bottom || 0) : 0
  root.style.setProperty('--tg-inset-top', `${top}px`)
  root.style.setProperty('--tg-inset-bottom', `${bottom}px`)
}

export function initTelegram() {
  const w = tg()
  if (!w) return
  try {
    w.ready()
    w.expand()
    w.setHeaderColor?.('#0E1116')
    w.setBackgroundColor?.('#0E1116')
    // Fullscreen (Bot API 8.0+): ilova Telegram paneli bilan bitta tekislikda
    // ochiladi, tugmalar kontent ustida suzadi. Qo'llab-quvvatlanmasa —
    // jim fallback: oddiy rejim, insetlar 0 bo'lib qoladi.
    try { w.requestFullscreen?.() } catch { /* qo'llab-quvvatlanmaydi */ }
    syncInsets(w)
    const update = () => { try { syncInsets(w) } catch { /* noop */ } }
    w.onEvent?.('safeAreaChanged', update)
    w.onEvent?.('contentSafeAreaChanged', update)
    w.onEvent?.('fullscreenChanged', update)
    w.onEvent?.('viewportChanged', update)
    // Insetlar async yetib kelishi mumkin (fullscreen keyin faollashadi)
    setTimeout(update, 300)
    setTimeout(update, 1200)
  } catch {
    /* brauzer rejimi — indamay davom etamiz */
  }
}
