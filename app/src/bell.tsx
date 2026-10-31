// O'yin kuzatuvi (qo'ng'iroqcha): foydalanuvchi o'yinni belgilaydi — bot
// (VM watcher orqali) start/gol/HT/FT/qizil karta/penalti haqida yozadi.
// Server holati adapterda (a=sub / a=subs, initData imzo bilan); localStorage —
// faqat lokal kesh (tez chizish), haqiqat manbai — server javobi.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { API_BASE } from './api'
import type { ApiMatch } from './data/types'
import { IconBell } from './icons'
import { tg, inTelegram } from './telegram'

const LS_KEY = 'golpulse-subs-v1'

interface SubEntry { id: string; deliverable: boolean | null }

interface SubsCtx {
  isSub: (id: string) => boolean
  /** null — watcher hali tekshirmagan; false — bot /start bosilmagan (xabar yetmaydi) */
  deliverable: (id: string) => boolean | null | undefined
  toggle: (m: ApiMatch) => void
}

const Ctx = createContext<SubsCtx | null>(null)

export function useSubs(): SubsCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('SubsProvider topilmadi')
  return c
}

function loadLocal(): SubEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as Array<string | SubEntry>
    return arr.map((x) => (typeof x === 'string' ? { id: x, deliverable: null } : x))
  } catch { return [] }
}

async function apiPost<T>(action: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}?a=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!json.success) throw new Error('Adapter xatosi')
  return json.data as T
}

export function SubsProvider({ children }: { children: ReactNode }) {
  const [subs, setSubs] = useState<Map<string, boolean | null>>(() => {
    const m = new Map<string, boolean | null>()
    for (const e of loadLocal()) m.set(e.id, e.deliverable)
    return m
  })
  const [toast, setToast] = useState<{ key: number; msg: string } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = useCallback((msg: string) => {
    setToast({ key: Date.now(), msg })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4200)
  }, [])

  useEffect(() => {
    try {
      const arr: SubEntry[] = [...subs.entries()].map(([id, deliverable]) => ({ id, deliverable }))
      localStorage.setItem(LS_KEY, JSON.stringify(arr))
    } catch { /* noop */ }
  }, [subs])

  // Ochilishda server bilan sinxronizatsiya (faqat Telegram ichida — initData kerak)
  useEffect(() => {
    if (!inTelegram()) return
    const initData = tg()?.initData
    if (!initData) return
    let alive = true
    apiPost<{ subs: SubEntry[] }>('subs', { initData })
      .then((d) => {
        if (!alive) return
        const m = new Map<string, boolean | null>()
        for (const e of d.subs) m.set(e.id, e.deliverable)
        setSubs(m)
      })
      .catch(() => { /* lokal kesh bilan qolamiz */ })
    return () => { alive = false }
  }, [])

  const toggle = useCallback((m: ApiMatch) => {
    const id = m.id
    const wasOn = subs.has(id)
    const on = !wasOn
    // Optimistik UI
    setSubs((prev) => {
      const next = new Map(prev)
      if (on) next.set(id, prev.get(id) ?? null)
      else next.delete(id)
      return next
    })
    const initData = tg()?.initData
    if (!inTelegram() || !initData) {
      showToast(on ? 'Kuzatuv saqlandi — xabarlar Telegram ilovasida keladi' : 'Kuzatuv o\'chirildi')
      return
    }
    apiPost<{ subscribed: boolean; deliverable: boolean | null }>('sub', {
      initData,
      match_id: id,
      on,
      meta: { home: m.home.name, away: m.away.name, league: m.leagueName, startTs: m.startTs },
    })
      .then((d) => {
        if (on) {
          setSubs((prev) => {
            const next = new Map(prev)
            if (next.has(id)) next.set(id, d.deliverable)
            return next
          })
          if (d.deliverable === false) {
            showToast('Xabar kelishi uchun @golpulse_bot da /start bosing')
          } else {
            showToast('Kuzatuv yoqildi — gol va hodisalar haqida yozaman')
          }
        }
      })
      .catch(() => {
        // Xato — optimistik holatni qaytarish
        setSubs((prev) => {
          const next = new Map(prev)
          if (wasOn) next.set(id, prev.get(id) ?? null)
          else next.delete(id)
          return next
        })
        showToast('Xatolik yuz berdi, qayta urining')
      })
  }, [subs, showToast])

  const value: SubsCtx = {
    isSub: (id) => subs.has(id),
    deliverable: (id) => (subs.has(id) ? subs.get(id) : undefined),
    toggle,
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && <div key={toast.key} className="sub-toast">{toast.msg}</div>}
    </Ctx.Provider>
  )
}

/** Qo'ng'iroqcha tugmasi: faol — yashil to'ldirilgan, nofaol — konturli kulrang */
export function BellButton({ match, size = 20 }: { match: ApiMatch; size?: number }) {
  const { isSub, toggle } = useSubs()
  const active = isSub(match.id)
  return (
    <button
      className={`bell-btn${active ? ' active' : ''}`}
      aria-label={active ? 'Kuzatuvni o\'chirish' : 'O\'yinni kuzatish'}
      onClick={(e) => { e.stopPropagation(); toggle(match) }}
    >
      <IconBell size={size} filled={active} />
    </button>
  )
}
