// Telegram WebApp SDK — yengil integratsiya.
// SDK yuklanmagan bo'lsa (oddiy brauzer) ilova to'liq ishlayveradi.
interface TgWebApp {
  ready: () => void
  expand: () => void
  setHeaderColor?: (c: string) => void
  setBackgroundColor?: (c: string) => void
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

export function initTelegram() {
  const w = tg()
  if (!w) return
  try {
    w.ready()
    w.expand()
    w.setHeaderColor?.('#0E1116')
    w.setBackgroundColor?.('#0E1116')
  } catch {
    /* brauzer rejimi — indamay davom etamiz */
  }
}
