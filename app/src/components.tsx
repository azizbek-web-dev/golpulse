import { useEffect, useRef, useState } from 'react'
import type { ApiMatch, LeagueStub, StandingRow, StatLine } from './data/types'
import { leagueInfo, localCrestFor, localLeagueLogo, teamInfo } from './api'
import { IconChevronDown, IconChevronUp, IconGrid, IconPin, IconStar } from './icons'

/** public/ dagi asset yo'li (Vite base bilan); to'liq URL bo'lsa o'zi qoladi */
export const asset = (path: string): string =>
  path.startsWith('http') ? path : `${import.meta.env.BASE_URL}${path}`

/** Jamoa gerbi: 1) o'zimizning sifatli gerb (nom bo'yicha) 2) fid gerbi 3) harfli doiracha */
export function Crest({ teamId, size = 22 }: { teamId: string; size?: number }) {
  const info = teamInfo(teamId)
  const local = localCrestFor(info.name)
  const src = local?.crest ?? info.crestUrl ?? undefined
  if (src) {
    return (
      <img
        className="crest-img"
        src={asset(src)}
        width={size}
        height={size}
        alt={info.name}
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <span
      className="crest"
      style={{ width: size, height: size, background: local?.color ?? info.color, fontSize: size * 0.34 }}
      aria-label={info.name}
    >
      {info.short}
    </span>
  )
}

/** Liga logotipi: o'ziniki → fid logotipi (oq chip) → mamlakat bayrog'i rasmi → nom qisqartmasi */
export function LeagueLogo({ leagueId, league, size = 24 }: { leagueId: string; league?: LeagueStub; size?: number }) {
  const l = league ?? leagueInfo(leagueId)
  const local = l ? localLeagueLogo(l) : undefined
  if (local) {
    return (
      <span className={`league-logo${local.includes('superliga') ? ' on-dark' : ''}`} style={{ width: size, height: size }}>
        <img src={asset(local)} alt={l?.name ?? ''} loading="lazy" />
      </span>
    )
  }
  if (l?.logoUrl) {
    return (
      <span className="league-logo" style={{ width: size, height: size }}>
        <img src={l.logoUrl} alt={l.name} loading="lazy" />
      </span>
    )
  }
  if (l?.countryImageUrl) {
    return <img className="league-flag-img" src={l.countryImageUrl} width={size} height={size} alt={l.country} loading="lazy" />
  }
  return <span className="league-flag" style={{ fontSize: size * 0.6 }}>{(l?.country ?? '').slice(0, 2).toUpperCase()}</span>
}

/** Reyting baloni — faqat fid reyting bergan o'yinlarda chaqiriladi */
export function ratingColor(v: number): string {
  if (v >= 9) return '#2E7CD6'
  if (v >= 8) return '#00B562'
  if (v >= 6.5) return '#9FBF1F'
  return '#E4572E'
}

const fmtRating = (v: number): string => {
  const s = v.toFixed(2)
  return s.endsWith('0') ? s.slice(0, -1) : s
}

export function RatingPill({ value, big }: { value: number; big?: boolean }) {
  return (
    <span className={`rating-pill${big ? ' big' : ''}`} style={{ background: ratingColor(value) }}>
      {fmtRating(value)}
    </span>
  )
}

export function StarBtn({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      className={`star-btn${active ? ' active' : ''}`}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      aria-label="Sevimlilarga qo'shish"
    >
      <IconStar size={21} filled={active} />
    </button>
  )
}

// ---- Umumiy 1 soniyalik tick: bitta interval barcha jonli qatorlar uchun ----
const tickSubs = new Set<() => void>()
let tickTimer: number | null = null
function useSecondTick(): void {
  const [, setTick] = useState(0)
  useEffect(() => {
    const fn = () => setTick((t) => t + 1)
    tickSubs.add(fn)
    if (tickTimer === null) {
      tickTimer = window.setInterval(() => { tickSubs.forEach((f) => f()) }, 1000)
    }
    return () => {
      tickSubs.delete(fn)
      if (tickSubs.size === 0 && tickTimer !== null) { window.clearInterval(tickTimer); tickTimer = null }
    }
  }, [])
}

/**
 * Jonli daqiqa: server har so'rovda timeSec beradi — daqiqa mijozda soat kabi
 * har soniya lokal yuradi (FlashScore hissi), har poll da server qiymati bilan
 * qayta sinxronlanadi (drift <= poll oralig'i).
 */
export function useLiveMinute(m: ApiMatch | null): number | null {
  useSecondTick()
  const baseRef = useRef<{ id: string; sec: number; at: number }>({ id: '', sec: 0, at: 0 })
  const serverSec = m?.timeSec
  const matchId = m?.id
  useEffect(() => {
    if (matchId && serverSec != null) {
      baseRef.current = { id: matchId, sec: serverSec, at: Date.now() }
    }
  }, [matchId, serverSec])
  if (!m) return null
  if (m.status !== 'live' || serverSec == null || m.timeRun === false) return m.minute ?? null
  const b = baseRef.current
  if (b.id !== m.id) return m.minute ?? Math.floor(serverSec / 60)
  const local = Math.floor((b.sec + (Date.now() - b.at) / 1000) / 60)
  return Math.max(local, m.minute ?? 0)
}

/** Hisob o'zgarganda qator chaqnashi (flash) uchun holat */
function useScoreFlash(m: ApiMatch): boolean {
  const [flash, setFlash] = useState(false)
  const prevRef = useRef<{ h: number | null | undefined; a: number | null | undefined; seen: boolean }>({
    h: undefined, a: undefined, seen: false,
  })
  useEffect(() => {
    const p = prevRef.current
    if (p.seen && (p.h !== m.homeScore || p.a !== m.awayScore)) {
      setFlash(true)
      const t = window.setTimeout(() => setFlash(false), 1700)
      prevRef.current = { h: m.homeScore, a: m.awayScore, seen: true }
      return () => window.clearTimeout(t)
    }
    prevRef.current = { h: m.homeScore, a: m.awayScore, seen: true }
  }, [m.homeScore, m.awayScore])
  return flash
}

export function statusLabel(m: ApiMatch): { text: string; live: boolean } {
  switch (m.status) {
    case 'live': return { text: `${m.minute ?? 0}'`, live: true }
    case 'halftime': return { text: 'Tanaffus', live: true }
    case 'finished': return { text: 'FT', live: false }
    default: return { text: m.startTime, live: false }
  }
}

/** Ikki qatorli o'yin qatori (FlashScore modeli) */
export function MatchRow({ match, onOpen }: { match: ApiMatch; onOpen: (id: string) => void }) {
  const liveMinute = useLiveMinute(match)
  const flash = useScoreFlash(match)
  const base = statusLabel(match)
  const st = match.status === 'live' && liveMinute !== null
    ? { text: `${liveMinute}'`, live: true }
    : base
  const showScore = match.status !== 'scheduled'
  const row = (team: ApiMatch['home'], score?: number | null) => (
    <div className="match-row-team">
      <Crest teamId={team.id} />
      <span className="match-row-name">{team.name}</span>
      {showScore && score !== null && score !== undefined
        ? <span key={score} className={`match-row-score pop${st.live ? ' live' : ''}`}>{score}</span>
        : <span className={`match-row-score${st.live ? ' live' : ''}`} />}
    </div>
  )
  return (
    <button className={`match-row${flash ? ' score-flash' : ''}`} onClick={() => onOpen(match.id)}>
      <div className="match-row-main">
        {row(match.home, match.homeScore)}
        {row(match.away, match.awayScore)}
      </div>
      <div className={`match-row-status${st.live ? ' live' : ''}`}>
        {match.status === 'live' && <span className="live-dot" />}
        {st.text}
      </div>
    </button>
  )
}

/** Liga guruhi sarlavhasi */
export function LeagueHeader({
  league, pinned, collapsed, onPin, onToggle, onOpenLeague, onOpenTable,
}: {
  league: LeagueStub
  pinned: boolean
  collapsed: boolean
  onPin: () => void
  onToggle: () => void
  onOpenLeague: () => void
  onOpenTable: () => void
}) {
  return (
    <div className="league-header">
      <button className="league-header-main" onClick={onOpenLeague}>
        <LeagueLogo leagueId={league.id} league={league} size={24} />
        <span className="league-name">{league.name}</span>
        {league.country && <span className="league-country">{league.country.toUpperCase()}</span>}
      </button>
      <button className={`icon-btn${pinned ? ' active' : ''}`} onClick={onPin} aria-label="Pin"><IconPin size={16} /></button>
      <button className="icon-btn" onClick={onOpenTable} aria-label="Jadval"><IconGrid size={16} /></button>
      <button className="icon-btn" onClick={onToggle} aria-label="Yig'ish">{collapsed ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}</button>
    </div>
  )
}

/** Ikki tomonlama statistika bari */
export function StatBar({ line }: { line: StatLine }) {
  const fmt = (v: number) => (line.decimals ? v.toFixed(line.decimals) : `${Math.round(v)}`) + (line.suffix ?? '')
  const max = Math.max(line.home, line.away, 1)
  const homeWin = line.home > line.away
  const awayWin = line.away > line.home
  return (
    <div className="stat-line">
      <div className="stat-values">
        <span className={`stat-val${homeWin ? ' win' : ''}`}>{fmt(line.home)}</span>
        <span className="stat-label">{line.label}</span>
        <span className={`stat-val right${awayWin ? ' win' : ''}`}>{fmt(line.away)}</span>
      </div>
      <div className="stat-bars">
        <div className="stat-bar home"><i style={{ width: `${(line.home / max) * 100}%`, background: homeWin ? 'var(--accent)' : '#3A4657' }} /></div>
        <div className="stat-bar away"><i style={{ width: `${(line.away / max) * 100}%`, background: awayWin ? 'var(--accent)' : '#3A4657' }} /></div>
      </div>
    </div>
  )
}

export function FormDots({ form }: { form: Array<'W' | 'D' | 'L'> }) {
  const label = { W: 'W', D: 'D', L: 'L' } as const
  return (
    <span className="form-dots">
      {form.map((f, i) => (
        <span key={i} className={`form-dot ${f}`}>{label[f]}</span>
      ))}
    </span>
  )
}

const zoneClass = (pos: number, total: number): string => {
  if (pos <= 4) return 'zone-ucl'
  if (pos >= total - 1) return 'zone-rel'
  return ''
}

/** Ixcham jadval + forma ustuni — 390px ga sig'adi, scroll yo'q */
export function StandingsTable({
  rows, highlight = [], onTeam,
}: {
  rows: StandingRow[]
  highlight?: string[]
  onTeam?: (teamId: string) => void
}) {
  return (
    <table className="standings">
      <thead>
        <tr><th className="c-pos">#</th><th className="c-team">Jamoa</th><th>O'</th><th>G'</th><th>D</th><th>M</th><th className="c-pts">Och</th><th className="c-form">Forma</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.team.id} className={highlight.includes(r.team.id) ? 'hl' : ''}>
            <td className="c-pos"><span className={`pos-box ${zoneClass(r.pos, rows.length)}`}>{r.pos}</span></td>
            <td className="c-team">
              <button className="team-cell" onClick={() => onTeam?.(r.team.id)}>
                <Crest teamId={r.team.id} size={20} />
                <span className="team-cell-name">{r.team.name}</span>
              </button>
            </td>
            <td>{r.played}</td><td>{r.won}</td><td>{r.drawn}</td><td>{r.lost}</td>
            <td className="c-pts">{r.points}</td>
            <td className="c-form">{r.form.length > 0 ? <FormDots form={r.form} /> : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Yuklanish skeleti */
export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-wrap" aria-label="Yuklanmoqda">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row"><span /><span className="short" /></div>
      ))}
    </div>
  )
}

/** Xato holati — mock ga jim qaytish yo'q, qayta urinish tugmasi bor */
export function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="error-box">
      <p>Ma'lumotni yuklab bo'lmadi. Internet aloqasini tekshirib, qayta urining.</p>
      <button className="primary-btn" onClick={onRetry}>Qayta urinish</button>
    </div>
  )
}
