import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
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

// ---- Yuklanish skeletlari: real kontent shakliga mos, ekran pastgacha to'ladi ----

/** Bitta shimmer blok (chiziq / doira / quti) */
export function SkBox({ w, h = 12, r = 6, circle = false, style }: {
  w: number | string; h?: number; r?: number; circle?: boolean; style?: CSSProperties
}) {
  return (
    <span
      className="sk"
      style={{ width: w, height: circle ? w : h, borderRadius: circle ? '50%' : r, ...style }}
    />
  )
}
export const SkLine = ({ w, h = 12, style }: { w: number | string; h?: number; style?: CSSProperties }) => (
  <SkBox w={w} h={h} style={style} />
)
export const SkCircle = ({ size }: { size: number }) => <SkBox w={size} circle />

/**
 * Skelet viewport oxirigacha to'lishi uchun: konteyner tepasidan ekran
 * pastigacha necha birlik (unit px) sig'ishini o'lchaydi (+1 birlik zaxira —
 * pastda bo'sh fon qolmaydi, kerak bo'lsa yengil scroll bo'ladi).
 */
export function useFillCount(unit: number, min = 2): { ref: RefObject<HTMLDivElement | null>; count: number } {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(min)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const top = el.getBoundingClientRect().top
      const need = window.innerHeight - top + unit
      setCount(Math.max(min, Math.ceil(need / unit)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [unit, min])
  return { ref, count }
}

/** children(i) ni ekran to'lguncha takrorlaydi */
export function FillRepeat({ unit, min = 2, children }: {
  unit: number; min?: number; children: (i: number) => ReactNode
}) {
  const { ref, count } = useFillCount(unit, min)
  return <div ref={ref}>{Array.from({ length: count }, (_, i) => children(i))}</div>
}

const NAME_W = ['62%', '48%', '70%', '55%', '66%', '42%', '58%', '74%']

/** O'yin qatori skeleti — real .match-row o'lchamlarida */
export function MatchRowSkeleton({ seed = 0 }: { seed?: number }) {
  return (
    <div className="match-row" aria-hidden>
      <div className="match-row-main">
        {[0, 1].map((r) => (
          <div className="match-row-team" key={r}>
            <SkCircle size={22} />
            <SkLine w={NAME_W[(seed + r * 3) % NAME_W.length]} h={13} />
            <span className="skel-score"><SkLine w={13} h={13} /></span>
          </div>
        ))}
      </div>
      <div className="match-row-status"><SkLine w={27} h={12} /></div>
    </div>
  )
}

/** Liga guruhi skeleti: sarlavha bloki + o'yin qatorlari */
export function LeagueGroupSkeleton({ rows = 3, seed = 0 }: { rows?: number; seed?: number }) {
  return (
    <section className="league-group" aria-hidden>
      <div className="league-header">
        <div className="league-header-main">
          <SkBox w={24} h={24} r={6} />
          <SkLine w={110 + (seed % 3) * 32} h={14} />
          <SkLine w={42} h={9} />
        </div>
        {[0, 1, 2].map((i) => (
          <span className="icon-btn" key={i}><SkBox w={15} h={15} r={4} /></span>
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => <MatchRowSkeleton key={i} seed={seed * 3 + i} />)}
    </section>
  )
}

/** Bosh/Jonli ro'yxat skeleti — guruhlar ekran to'lguncha */
export function HomeSkeleton() {
  const rowCounts = [4, 3, 4, 2, 3]
  return (
    <FillRepeat unit={250} min={2}>
      {(i) => <LeagueGroupSkeleton key={i} rows={rowCounts[i % rowCounts.length]} seed={i} />}
    </FillRepeat>
  )
}

/** Faqat o'yin qatorlari (Sevimlilar va b.) — ekran to'lguncha */
export function MatchListSkeleton({ min = 3 }: { min?: number }) {
  return (
    <FillRepeat unit={67} min={min}>
      {(i) => <MatchRowSkeleton key={i} seed={i} />}
    </FillRepeat>
  )
}

/** Jadval skeleti — real <table> o'lchamlarida, qatorlar ekran to'lguncha */
export function StandingsSkeleton({ min = 10 }: { min?: number }) {
  const { ref, count } = useFillCount(35, min)
  return (
    <div ref={ref} aria-hidden>
      <table className="standings skel">
        <thead>
          <tr><th className="c-pos">#</th><th className="c-team">Jamoa</th><th>O'</th><th>G'</th><th>D</th><th>M</th><th className="c-pts">Och</th><th className="c-form">Forma</th></tr>
        </thead>
        <tbody>
          {Array.from({ length: count }, (_, i) => (
            <tr key={i}>
              <td className="c-pos"><SkBox w={21} h={21} r={6} /></td>
              <td className="c-team">
                <span className="team-cell">
                  <SkCircle size={20} />
                  <SkLine w={64 + (i % 4) * 13} h={12} />
                </span>
              </td>
              <td><SkLine w={11} h={11} /></td>
              <td><SkLine w={11} h={11} /></td>
              <td><SkLine w={11} h={11} /></td>
              <td><SkLine w={11} h={11} /></td>
              <td className="c-pts"><SkLine w={15} h={11} /></td>
              <td className="c-form">
                <span className="form-dots">
                  {[0, 1, 2, 3, 4].map((d) => <SkBox key={d} w={13} h={13} circle />)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Tab qatorlari skeleti (asosiy / ichki) */
export function TabsSkeleton({ sub = false }: { sub?: boolean }) {
  return (
    <div className={`tabs${sub ? ' sub' : ' main'}`} aria-hidden>
      {[0, 1, 2].map((i) => <span key={i} className="sk sk-tab" />)}
    </div>
  )
}

/** Hisob taxtasi skeleti */
export function ScoreboardSkeleton() {
  const side = (w: string) => (
    <div className="score-side">
      <SkCircle size={54} />
      <SkLine w={w} h={15} />
      <SkLine w={30} h={27} />
    </div>
  )
  return (
    <>
      <div className="match-league-line" aria-hidden>
        <SkCircle size={16} />
        <SkLine w={168} h={12} />
      </div>
      <div className="scoreboard" aria-hidden>
        {side('74%')}
        <div className="score-center">
          <SkLine w={56} h={13} />
          <SkLine w={72} h={10} />
        </div>
        {side('60%')}
      </div>
    </>
  )
}

/** Voqealar tabi skeleti: tablo chiplari + bo'lim sarlavhasi + voqea qatorlari */
export function EventsSkeleton() {
  return (
    <div aria-hidden>
      <div className="tablo-chips">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="tablo-chip">
            <SkLine w={32} h={9} />
            <SkLine w={25} h={13} />
          </span>
        ))}
      </div>
      <div className="half-head"><SkLine w={104} h={12} /></div>
      <FillRepeat unit={47} min={4}>
        {(i) => (
          <div key={i} className={`event-row${i % 3 === 2 ? ' away' : ''}`}>
            <SkBox w={32} h={26} r={7} />
            <SkCircle size={16} />
            <span className="event-text">
              <SkLine w={i % 2 ? 118 : 164} h={13} />
              <SkLine w={76} h={10} />
            </span>
          </div>
        )}
      </FillRepeat>
    </div>
  )
}

/** Statistika tabi skeleti: ikki tomonlama bar qatorlari */
export function StatsSkeleton() {
  return (
    <div className="stats-list" aria-hidden>
      <FillRepeat unit={55} min={6}>
        {(i) => (
          <div className="stat-line" key={i}>
            <div className="stat-values">
              <span className="stat-val"><SkLine w={25} h={14} /></span>
              <span className="stat-label skel-label"><SkLine w={76 + (i % 3) * 22} h={12} /></span>
              <span className="stat-val right"><SkLine w={25} h={14} style={{ marginLeft: 'auto' }} /></span>
            </div>
            <div className="stat-bars">
              <div className="stat-bar home"><SkBox w="100%" h={5} r={3} /></div>
              <div className="stat-bar away"><SkBox w="100%" h={5} r={3} /></div>
            </div>
          </div>
        )}
      </FillRepeat>
    </div>
  )
}

const PITCH_DOTS: Array<[number, number]> = [
  [50, 6], [22, 17], [41, 20], [59, 20], [78, 17], [30, 32], [50, 35], [70, 32], [40, 44], [60, 44],
  [50, 94], [22, 83], [41, 80], [59, 80], [78, 83], [30, 68], [50, 65], [70, 68], [40, 56], [60, 56],
]

/** Tarkiblar tabi skeleti: sxema sarlavhasi + maydon + tarkib qatorlari */
export function LineupsSkeleton() {
  return (
    <div aria-hidden>
      <div className="formation-head">
        <span><SkCircle size={20} /><SkLine w={50} h={14} /></span>
        <span className="formation-vs">—</span>
        <span><SkLine w={50} h={14} /><SkCircle size={20} /></span>
      </div>
      <div className="pitch skel">
        <div className="pitch-line mid" /><div className="pitch-circle" />
        <div className="pitch-line box-top" /><div className="pitch-line box-bottom" />
        {PITCH_DOTS.map(([x, y], i) => (
          <SkBox key={i} w={23} circle style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', zIndex: 1 }} />
        ))}
      </div>
      <h3 className="block-title"><SkLine w={128} h={15} /></h3>
      <div className="lineup-list">
        {[0, 1, 2, 3, 4].map((i) => (
          <div className="lineup-row" key={i}>
            <SkCircle size={30} />
            <span className="lineup-name">
              <SkLine w="52%" h={13} />
              <SkLine w="32%" h={10} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** H2H tabi skeleti: xulosa kataklari + o'tgan o'yinlar */
export function H2HSkeleton() {
  return (
    <div aria-hidden>
      <div className="h2h-summary">
        {[0, 1, 2].map((i) => (
          <div className="h2h-cell" key={i}>
            <SkLine w={28} h={23} style={{ margin: '0 auto' }} />
            <SkLine w="72%" h={10} style={{ margin: '0 auto' }} />
          </div>
        ))}
      </div>
      <div className="h2h-note"><SkLine w={150} h={12} style={{ margin: '0 auto' }} /></div>
      <h3 className="block-title"><SkLine w={148} h={15} /></h3>
      <FillRepeat unit={47} min={4}>
        {(i) => (
          <div className="h2h-row" key={i}>
            <SkLine w={54} h={11} />
            <span style={{ flex: 1 }}><SkLine w="62%" h={12} /></span>
            <SkLine w={27} h={13} />
          </div>
        )}
      </FillRepeat>
    </div>
  )
}

/** O'yin sahifasi skeleti — tanlangan tablarga mos shaklda */
export function MatchSkeleton({ main = 'game', sub = 'events' }: {
  main?: 'game' | 'h2h' | 'table'
  sub?: 'events' | 'stats' | 'lineups'
}) {
  return (
    <div aria-label="Yuklanmoqda">
      <ScoreboardSkeleton />
      <TabsSkeleton />
      {main === 'game' && (
        <>
          <TabsSkeleton sub />
          {sub === 'events' && <EventsSkeleton />}
          {sub === 'stats' && <StatsSkeleton />}
          {sub === 'lineups' && <LineupsSkeleton />}
        </>
      )}
      {main === 'h2h' && <H2HSkeleton />}
      {main === 'table' && <StandingsSkeleton />}
    </div>
  )
}

/** Liga sahifasi skeleti: hero + tablar + o'yin qatorlari */
export function LeagueSkeleton() {
  return (
    <div aria-label="Yuklanmoqda">
      <div className="league-hero" aria-hidden>
        <SkBox w={52} h={52} r={12} />
        <div>
          <SkLine w={148} h={19} />
          <div style={{ marginTop: 6 }}><SkLine w={104} h={12} /></div>
        </div>
      </div>
      <TabsSkeleton />
      <MatchListSkeleton min={4} />
    </div>
  )
}

/** Meta karta skeleti (jamoa/o'yinchi) */
export function MetaCardSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="meta-card" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div className="meta-row" key={i}>
          <SkLine w={66} h={13} />
          <SkLine w={118 - i * 22} h={13} />
        </div>
      ))}
    </div>
  )
}

/** Oxirgi o'yinlar qatori skeleti (h2h-row shakli) */
export function RecentRowSkeleton() {
  return (
    <div className="h2h-row" aria-hidden>
      <SkBox w={24} h={24} r={8} />
      <SkLine w={52} h={11} />
      <span style={{ flex: 1 }}><SkLine w="64%" h={12} /></span>
      <SkLine w={29} h={13} />
    </div>
  )
}

/** Jamoa sahifasi skeleti */
export function TeamSkeleton() {
  return (
    <div aria-label="Yuklanmoqda">
      <div className="team-hero" aria-hidden>
        <SkCircle size={64} />
        <div className="team-hero-main">
          <SkLine w="52%" h={19} />
          <div style={{ marginTop: 6 }}><SkLine w="34%" h={12} /></div>
        </div>
        <SkCircle size={29} />
      </div>
      <MetaCardSkeleton rows={2} />
      <h3 className="block-title"><SkLine w={118} h={15} /></h3>
      <MatchRowSkeleton seed={1} />
      <h3 className="block-title"><SkLine w={138} h={15} /></h3>
      <FillRepeat unit={47} min={4}>
        {(i) => <RecentRowSkeleton key={i} />}
      </FillRepeat>
    </div>
  )
}

/** O'yinchi sahifasi skeleti */
export function PlayerSkeleton() {
  return (
    <div aria-label="Yuklanmoqda">
      <div className="player-hero" aria-hidden>
        <SkCircle size={64} />
        <div>
          <SkLine w={142} h={19} />
          <div style={{ marginTop: 7 }}><SkLine w={102} h={13} /></div>
        </div>
      </div>
      <MetaCardSkeleton rows={3} />
      <h3 className="block-title"><SkLine w={172} h={15} /></h3>
      <FillRepeat unit={47} min={4}>
        {(i) => <RecentRowSkeleton key={i} />}
      </FillRepeat>
    </div>
  )
}

/** Ligalar ro'yxati skeleti */
export function LeaguesSkeleton() {
  return (
    <div aria-label="Yuklanmoqda">
      <div className="section-label" aria-hidden><SkLine w={92} h={12} /></div>
      <FillRepeat unit={68} min={5}>
        {(i) => (
          <div className="league-row" key={i} aria-hidden>
            <SkBox w={34} h={34} r={8} />
            <span className="league-row-main">
              <SkLine w={118 + (i % 3) * 26} h={14} />
              <SkLine w={88} h={11} />
            </span>
            <SkBox w={16} h={16} r={4} />
          </div>
        )}
      </FillRepeat>
    </div>
  )
}

/** Qidiruv natijalari skeleti: bo'lim sarlavhasi + natija qatorlari */
export function SearchSkeleton() {
  return (
    <div aria-label="Yuklanmoqda">
      <div className="section-label" aria-hidden><SkLine w={78} h={12} /></div>
      <FillRepeat unit={60} min={5}>
        {(i) => (
          <div className="search-row" key={i} aria-hidden>
            <div className="search-row-main">
              <SkCircle size={30} />
              <span>
                <SkLine w={108 + (i % 3) * 24} h={14} />
                <SkLine w={68} h={11} />
              </span>
            </div>
            <SkCircle size={29} />
          </div>
        )}
      </FillRepeat>
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
