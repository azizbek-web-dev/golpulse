import type { Match, StandingRow, StatLine } from './data/types'
import { teamById, extraTeams, leagueById } from './data/mock'

// Jamoa vizual ma'lumoti (asosiy ro'yxat + standings dagi qo'shimcha jamoalar)
export function teamInfo(id: string): { name: string; short: string; color: string } {
  const t = (() => { try { return teamById(id) } catch { return undefined } })()
  if (t) return { name: t.name, short: t.short, color: t.color }
  const e = extraTeams[id]
  if (e) return e
  return { name: id, short: id.slice(0, 3).toUpperCase(), color: '#555' }
}

export function Crest({ teamId, size = 22 }: { teamId: string; size?: number }) {
  const info = teamInfo(teamId)
  return (
    <span
      className="crest"
      style={{ width: size, height: size, background: info.color, fontSize: size * 0.34 }}
      aria-label={info.name}
    >
      {info.short}
    </span>
  )
}

/** Reyting baloni — SofaScore shkalasi */
export function ratingColor(v: number): string {
  if (v >= 9) return '#2E7CD6' // ko'k
  if (v >= 8) return '#00B562' // yashil
  if (v >= 6.5) return '#9FBF1F' // sariq-yashil
  return '#E4572E' // qizil-sarg'ish
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
      {active ? '★' : '☆'}
    </button>
  )
}

export function statusLabel(m: Match): { text: string; live: boolean } {
  switch (m.status) {
    case 'live': return { text: `${m.minute}'`, live: true }
    case 'halftime': return { text: 'Tanaffus', live: true }
    case 'finished': return { text: 'FT', live: false }
    default: return { text: m.startTime, live: false }
  }
}

/** Ikki qatorli o'yin qatori (FlashScore modeli) */
export function MatchRow({ match, onOpen }: { match: Match; onOpen: (id: string) => void }) {
  const st = statusLabel(match)
  const showScore = match.status !== 'scheduled'
  const row = (teamId: string, score?: number) => (
    <div className="match-row-team">
      <Crest teamId={teamId} />
      <span className="match-row-name">{teamInfo(teamId).name}</span>
      <span className={`match-row-score${st.live ? ' live' : ''}`}>{showScore ? score : ''}</span>
    </div>
  )
  return (
    <button className="match-row" onClick={() => onOpen(match.id)}>
      <div className="match-row-main">
        {row(match.homeId, match.homeScore)}
        {row(match.awayId, match.awayScore)}
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
  leagueId, pinned, collapsed, onPin, onToggle, onOpenLeague, onOpenTable,
}: {
  leagueId: string
  pinned: boolean
  collapsed: boolean
  onPin: () => void
  onToggle: () => void
  onOpenLeague: () => void
  onOpenTable: () => void
}) {
  const l = leagueById(leagueId)
  return (
    <div className="league-header">
      <button className="league-header-main" onClick={onOpenLeague}>
        <span className="league-flag">{l.flag}</span>
        <span className="league-name">{l.name}</span>
        <span className="league-country">{l.country.toUpperCase()}</span>
      </button>
      <button className={`icon-btn${pinned ? ' active' : ''}`} onClick={onPin} aria-label="Pin">📌</button>
      <button className="icon-btn" onClick={onOpenTable} aria-label="Jadval">▦</button>
      <button className="icon-btn" onClick={onToggle} aria-label="Yig'ish">{collapsed ? '▾' : '▴'}</button>
    </div>
  )
}

/** Ikki tomonlama statistika bari */
export function StatBar({ line }: { line: StatLine }) {
  const fmt = (v: number) => (line.decimals ? v.toFixed(line.decimals) : `${v}`) + (line.suffix ?? '')
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

/** Momentum grafigi — SVG ustunlar (tepa: uy bosimi, past: mehmon) */
export function MomentumChart({ data }: { data: number[] }) {
  const w = 340, h = 92, mid = h / 2, bw = w / data.length
  return (
    <div className="momentum">
      <div className="momentum-title">O'yin bosimi (Momentum)</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="momentum-svg" preserveAspectRatio="none">
        <line x1="0" y1={mid} x2={w} y2={mid} stroke="#2A3342" strokeWidth="1" />
        {data.map((v, i) => {
          const bh = (Math.abs(v) / 100) * (mid - 4)
          return (
            <rect
              key={i}
              x={i * bw + 0.5}
              y={v >= 0 ? mid - bh : mid}
              width={bw - 1}
              height={bh}
              rx="1"
              fill={v >= 0 ? 'var(--accent)' : '#5B6B82'}
              opacity={v >= 0 ? 0.95 : 0.75}
            />
          )
        })}
      </svg>
      <div className="momentum-axis"><span>1'</span><span>45'</span><span>90'</span></div>
    </div>
  )
}

export function FormDots({ form }: { form: Array<'W' | 'D' | 'L'> }) {
  return (
    <span className="form-dots">
      {form.map((f, i) => (
        <span key={i} className={`form-dot ${f}`}>{f}</span>
      ))}
    </span>
  )
}

const zoneClass = (pos: number, total: number): string => {
  if (pos <= 4) return 'zone-ucl'
  if (pos >= total - 1) return 'zone-rel'
  return ''
}

/** Ixcham jadval — 390px ga sig'adi, scroll yo'q */
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
        <tr><th className="c-pos">#</th><th className="c-team">Jamoa</th><th>O'</th><th>G'</th><th>D</th><th>M</th><th>To'p</th><th className="c-pts">Och</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.teamId} className={highlight.includes(r.teamId) ? 'hl' : ''}>
            <td className="c-pos"><span className={`pos-box ${zoneClass(r.pos, rows.length)}`}>{r.pos}</span></td>
            <td className="c-team">
              <button className="team-cell" onClick={() => onTeam?.(r.teamId)}>
                <Crest teamId={r.teamId} size={20} />
                <span>{teamInfo(r.teamId).name}</span>
              </button>
            </td>
            <td>{r.played}</td><td>{r.won}</td><td>{r.drawn}</td><td>{r.lost}</td><td>{r.goals}</td>
            <td className="c-pts">{r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
