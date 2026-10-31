import { useEffect, useMemo, useState } from 'react'
import { fetchDay, registerLeague, registerMatchDate, registerTeam, useFetch } from '../api'
import type { ApiMatch } from '../data/types'
import { ErrorBox, HomeSkeleton, LeagueHeader, MatchRow } from '../components'
import { IconCalendar, IconChevronLeft, IconChevronRight } from '../icons'
import { useNav } from '../nav'

type Filter = 'all' | 'live' | 'finished' | 'scheduled'
const ALL_CHIPS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'Barchasi' },
  { key: 'live', label: 'Jonli' },
  { key: 'finished', label: 'Tugagan' },
  { key: 'scheduled', label: 'Rejalashtirilgan' },
]

const matchFilter = (f: Filter) => (m: ApiMatch) => {
  if (f === 'all') return true
  if (f === 'live') return m.status === 'live' || m.status === 'halftime'
  return m.status === f
}

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'] // getUTCDay(): 0 = yakshanba
const MIN_DAY = -14 // fid natijalari real qoplaydigan oraliq (adapter ham shu bilan cheklaydi)
const MAX_DAY = 7

// ---- Sana yordamchilari (kun chegarasi — Asia/Tashkent) ----
function tzToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
function parseKey(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number)
  return [y, m, d]
}
function keyOf(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function shiftKey(key: string, delta: number): string {
  const [y, m, d] = parseKey(key)
  const dt = new Date(Date.UTC(y, m - 1, d + delta))
  return keyOf(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}
function diffDays(a: string, b: string): number {
  const [ay, am, ad] = parseKey(a)
  const [by, bm, bd] = parseKey(b)
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86400000)
}
function dateLabel(key: string, today: string): string {
  const diff = diffDays(key, today)
  const [y, m, d] = parseKey(key)
  const base = `${d}-${MONTHS[m - 1]}`
  if (diff === 0) return `Bugun, ${base}`
  if (diff === -1) return `Kecha, ${base}`
  if (diff === 1) return `Ertaga, ${base}`
  return `${base}, ${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}`
}

/** Pastdan chiqadigan kalendar: oy ko'rinishi + tez tugmalar (Kecha / Bugun / Ertaga) */
function CalendarSheet({ today, value, onPick, onClose }: {
  today: string
  value: string
  onPick: (key: string) => void
  onClose: () => void
}) {
  const [vy, vm] = parseKey(value)
  const [view, setView] = useState<[number, number]>([vy, vm])
  const minKey = shiftKey(today, MIN_DAY)
  const maxKey = shiftKey(today, MAX_DAY)
  const [minY, minM] = parseKey(minKey)
  const [maxY, maxM] = parseKey(maxKey)
  const canPrev = view[0] > minY || (view[0] === minY && view[1] > minM)
  const canNext = view[0] < maxY || (view[0] === maxY && view[1] < maxM)
  const firstDow = (new Date(Date.UTC(view[0], view[1] - 1, 1)).getUTCDay() + 6) % 7 // dushanba = 0
  const daysInMonth = new Date(Date.UTC(view[0], view[1], 0)).getUTCDate()
  const cells: Array<string | null> = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(keyOf(view[0], view[1], d))
  const moveMonth = (delta: number) => {
    const dt = new Date(Date.UTC(view[0], view[1] - 1 + delta, 1))
    setView([dt.getUTCFullYear(), dt.getUTCMonth() + 1])
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-quick">
          <button onClick={() => onPick(shiftKey(today, -1))}>Kecha</button>
          <button onClick={() => onPick(today)}>Bugun</button>
          <button onClick={() => onPick(shiftKey(today, 1))}>Ertaga</button>
        </div>
        <div className="cal-head">
          <button disabled={!canPrev} onClick={() => moveMonth(-1)} aria-label="Oldingi oy"><IconChevronLeft size={18} /></button>
          <span>{MONTHS[view[1] - 1]} {view[0]}</span>
          <button disabled={!canNext} onClick={() => moveMonth(1)} aria-label="Keyingi oy"><IconChevronRight size={18} /></button>
        </div>
        <div className="cal-grid cal-dow">
          {['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'].map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="cal-grid">
          {cells.map((k, i) => k === null ? <span key={`x${i}`} /> : (
            <button
              key={k}
              disabled={k < minKey || k > maxKey}
              className={`${k === today ? 'cal-today' : ''}${k === value ? ' cal-sel' : ''}`}
              onClick={() => onPick(k)}
            >
              {parseKey(k)[2]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Bosh/Jonli ro'yxat — real fid, liga guruhlari, sana tanlash bilan */
export default function HomePage({ defaultFilter }: { defaultFilter: Filter }) {
  const nav = useNav()
  const [today] = useState(tzToday)
  const [date, setDate] = useState(today)
  const [filter, setFilter] = useState<Filter>(defaultFilter)
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [calOpen, setCalOpen] = useState(false)

  const diff = diffDays(date, today)
  const isToday = diff === 0
  const kind = diff < 0 ? 'past' : diff > 0 ? 'future' : 'today'
  const pollMs = isToday ? 5000 : kind === 'future' ? 60000 : undefined
  const { data, error, loading, reload } = useFetch(() => fetchDay(date), [date], pollMs)
  // Boshqa kunning eski ma'lumoti ko'rinmasin — faqat tanlangan kunning javobi
  const dayData = data && data.date === date ? data : null

  useEffect(() => { setFilter(defaultFilter) }, [date, defaultFilter])

  if (dayData) {
    for (const g of dayData.leagues) {
      registerLeague(g)
      for (const m of g.games) {
        registerTeam(m.home)
        registerTeam(m.away)
        if (!isToday) registerMatchDate(m.id, date)
      }
    }
  }

  // Kun turiga mos chiplar: «Jonli» faqat bugunda, o'tgan kunda — tugagan, kelgusida — rejalashtirilgan
  const chips = ALL_CHIPS.filter((c) =>
    kind === 'today' ? true : kind === 'past' ? c.key !== 'live' && c.key !== 'scheduled' : c.key !== 'live' && c.key !== 'finished')
  const effFilter: Filter = chips.some((c) => c.key === filter) ? filter : 'all'

  const groups = useMemo(() => {
    if (!dayData) return []
    const f = matchFilter(effFilter)
    return dayData.leagues
      .map((l) => ({ league: l, games: l.games.filter(f) }))
      .filter((g) => g.games.length > 0)
      .sort((a, b) => Number(pinned.has(b.league.id)) - Number(pinned.has(a.league.id)))
  }, [dayData, effFilter, pinned])

  const toggleSet = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id); else next.add(id)
    apply(next)
  }

  const pickDate = (key: string) => { setDate(key); setCalOpen(false) }

  return (
    <div className="page">
      <div className="date-nav">
        <button
          className="icon-btn date-arrow"
          disabled={diff <= MIN_DAY}
          onClick={() => setDate(shiftKey(date, -1))}
          aria-label="Oldingi kun"
        >
          <IconChevronLeft size={20} />
        </button>
        <button className="date-nav-label date-nav-btn" onClick={() => setCalOpen(true)}>
          <IconCalendar size={15} /> {dateLabel(date, today)}
        </button>
        <button
          className="icon-btn date-arrow"
          disabled={diff >= MAX_DAY}
          onClick={() => setDate(shiftKey(date, 1))}
          aria-label="Keyingi kun"
        >
          <IconChevronRight size={20} />
        </button>
      </div>

      <div className="chips-bar">
        <div className="chips">
          {chips.map((c) => (
            <button
              key={c.key}
              className={`chip${effFilter === c.key ? ' active' : ''}`}
              onClick={() => setFilter(c.key)}
            >
              {c.label}
              {c.key === 'live' && dayData && dayData.counts.live > 0 && <span className="chip-badge">{dayData.counts.live}</span>}
            </button>
          ))}
        </div>
      </div>

      {loading && !dayData && <HomeSkeleton />}
      {error && !dayData && <ErrorBox onRetry={reload} />}

      {dayData && groups.length === 0 && (
        <div className="empty-note">{effFilter === 'all' && !isToday ? "Bu kunda o'yinlar topilmadi" : "Bu filtr bo'yicha o'yinlar yo'q"}</div>
      )}

      {groups.map(({ league, games }) => (
        <section className="league-group" key={league.id}>
          <LeagueHeader
            league={league}
            pinned={pinned.has(league.id)}
            collapsed={collapsed.has(league.id)}
            onPin={() => toggleSet(pinned, league.id, setPinned)}
            onToggle={() => toggleSet(collapsed, league.id, setCollapsed)}
            onOpenLeague={() => { if (!league.id.startsWith('res-')) nav.openLeague(league.id) }}
            onOpenTable={() => { if (!league.id.startsWith('res-')) nav.openLeague(league.id) }}
          />
          {!collapsed.has(league.id) && games.map((m) => (
            <MatchRow key={m.id} match={m} onOpen={nav.openMatch} />
          ))}
        </section>
      ))}

      {calOpen && (
        <CalendarSheet today={today} value={date} onPick={pickDate} onClose={() => setCalOpen(false)} />
      )}
    </div>
  )
}
