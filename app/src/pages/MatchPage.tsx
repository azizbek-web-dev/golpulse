import { useState, type ReactNode } from 'react'
import { matchById, teamById, leagueById, standingsFull, h2hSummary, h2hPast } from '../data/mock'
import type { Match, MatchEvent } from '../data/types'
import { asset, Crest, LeagueLogo, MomentumChart, RatingPill, StandingsTable, StarBtn, StatBar, teamInfo } from '../components'
import { IconBall, IconCard, IconMapPin, IconSub, IconTarget } from '../icons'
import { useNav } from '../nav'

const EVENT_ICON: Record<MatchEvent['type'], ReactNode> = {
  goal: <IconBall size={16} />,
  'pen-goal': <IconBall size={16} />,
  yellow: <IconCard size={15} color="#FFC531" />,
  red: <IconCard size={15} color="#FF453A" />,
  sub: <IconSub size={16} />,
  chance: <IconTarget size={16} />,
}

// Sxema koordinatalari: [x%, y%] — y o'z darvozasidan (0) raqib darvozasigacha (100)
const FORMATIONS: Record<string, Array<[number, number]>> = {
  '4-1-4-1': [[50, 5], [12, 19], [38, 16], [62, 16], [88, 19], [50, 31], [12, 48], [38, 44], [62, 44], [88, 48], [50, 63]],
  '4-2-3-1': [[50, 5], [12, 19], [38, 16], [62, 16], [88, 19], [35, 31], [65, 31], [15, 48], [50, 47], [85, 48], [50, 68]],
}

function EventRow({ ev, homeId }: { ev: MatchEvent; homeId: string }) {
  const isHome = ev.teamId === homeId
  return (
    <div className={`event-row${isHome ? '' : ' away'}`}>
      <span className="event-min">{ev.minute}'</span>
      <span className="event-icon">{EVENT_ICON[ev.type]}</span>
      <span className="event-text">
        <b>{ev.player}</b>
        {ev.note && <small>{ev.note}</small>}
      </span>
    </div>
  )
}

function EventsTab({ match }: { match: Match }) {
  const evs = match.events ?? []
  if (evs.length === 0) {
    return <div className="empty-note">Voqealar hali yo'q — o'yin boshlangach shu yerda chiqadi</div>
  }
  const first = evs.filter((e) => e.minute <= 45)
  const second = evs.filter((e) => e.minute > 45)
  const ht = match.htHome !== undefined ? `${match.htHome}:${match.htAway}` : ''
  const ft = match.homeScore !== undefined ? `${match.homeScore}:${match.awayScore}` : ''
  return (
    <div>
      {match.momentum && <MomentumChart data={match.momentum} />}
      {second.length > 0 && (
        <>
          <div className="half-head">2-bo'lim — {ft}</div>
          {second.map((e, i) => <EventRow key={i} ev={e} homeId={match.homeId} />)}
        </>
      )}
      <div className="half-head">1-bo'lim — {ht}</div>
      {first.map((e, i) => <EventRow key={i} ev={e} homeId={match.homeId} />)}
      <div className="match-meta">
        {match.venue && <span><IconMapPin size={13} /> {match.venue}</span>}
        {match.referee && <span>Hakam: {match.referee}</span>}
      </div>
    </div>
  )
}

function StatsTab({ match }: { match: Match }) {
  const [period, setPeriod] = useState<'all' | 'h1' | 'h2'>('all')
  if (!match.stats) return <div className="empty-note">Statistika bu o'yin uchun hali shakllanmadi</div>
  return (
    <div>
      <div className="chips small">
        {([['all', 'Butun o\'yin'], ['h1', '1-bo\'lim'], ['h2', '2-bo\'lim']] as const).map(([k, l]) => (
          <button key={k} className={`chip${period === k ? ' active' : ''}`} onClick={() => setPeriod(k)}>{l}</button>
        ))}
      </div>
      {period === 'all' ? (
        <div className="stats-list">
          {match.stats.map((s) => <StatBar key={s.label} line={s} />)}
        </div>
      ) : (
        <div className="empty-note">Namuna UI: davrlar bo'yicha statistika real fid ulanganda to'ldiriladi</div>
      )}
    </div>
  )
}

function Pitch({ match }: { match: Match }) {
  const renderTeam = (lineup: NonNullable<Match['homeLineup']>, formation: string, isHome: boolean, teamId: string) => {
    const coords = FORMATIONS[formation] ?? FORMATIONS['4-2-3-1']
    const crest = teamInfo(teamId).crest
    return lineup.map((p, i) => {
      const [x, y] = coords[i] ?? [50, 50]
      // Chetlardan ichkari tortamiz — darvozabon/o'yinchi bloki maydon tashqarisiga chiqmasin
      const top = isHome ? 5 + (y / 2) * 0.9 : 95 - (y / 2) * 0.9
      return (
        <div key={i} className="pitch-player" style={{ left: `${x}%`, top: `${top}%` }}>
          {crest ? (
            <span className="pitch-dotwrap">
              <img className="pitch-crest" src={asset(crest)} alt="" />
              <span className="pitch-num">{p.number}</span>
            </span>
          ) : (
            <span className={`pitch-dot${isHome ? ' home' : ' away'}`}>{p.number}</span>
          )}
          <span className="pitch-name">{p.name.split(' ').slice(-1)[0]}</span>
          {p.rating !== undefined && <RatingPill value={p.rating} />}
        </div>
      )
    })
  }
  if (!match.homeLineup || !match.awayLineup) return null
  return (
    <div className="pitch">
      <div className="pitch-line mid" /><div className="pitch-circle" />
      <div className="pitch-line box-top" /><div className="pitch-line box-bottom" />
      {renderTeam(match.homeLineup, match.homeFormation ?? '4-2-3-1', true, match.homeId)}
      {renderTeam(match.awayLineup, match.awayFormation ?? '4-2-3-1', false, match.awayId)}
    </div>
  )
}

function LineupsTab({ match }: { match: Match }) {
  const nav = useNav()
  if (!match.homeLineup || !match.awayLineup) {
    return <div className="empty-note">Tarkiblar o'yin boshlanishidan ~1 soat oldin e'lon qilinadi</div>
  }
  const home = teamById(match.homeId)
  const away = teamById(match.awayId)
  const list = (players: NonNullable<Match['homeLineup']>, teamId: string) => (
    <div className="lineup-list">
      {players.map((p) => (
        <button
          key={p.number}
          className="lineup-row"
          onClick={() => { if (p.name === 'Lewis Cook') nav.openPlayer('p-cook') }}
        >
          <span className="lineup-num">{p.number}</span>
          <span className="lineup-name">
            <span className="lineup-name-line">
              {p.name}
              {p.goals ? <em><IconBall size={13} />×{p.goals}</em> : null}
              {p.yellow ? <em><IconCard size={12} color="#FFC531" /></em> : null}
            </span>
            <small>{teamInfo(teamId).short} · {p.pos}</small>
          </span>
          {p.rating !== undefined && <RatingPill value={p.rating} />}
        </button>
      ))}
    </div>
  )
  return (
    <div>
      <div className="formation-head">
        <span><Crest teamId={match.homeId} size={20} /> {match.homeFormation}</span>
        {match.homeRating && <RatingPill value={match.homeRating} big />}
        <span className="formation-vs">—</span>
        {match.awayRating && <RatingPill value={match.awayRating} big />}
        <span>{match.awayFormation} <Crest teamId={match.awayId} size={20} /></span>
      </div>
      <Pitch match={match} />
      <h3 className="block-title">{home.name}</h3>
      {list(match.homeLineup, match.homeId)}
      <div className="subs-line">Zaxira: {(match.homeSubs ?? []).join(', ')}</div>
      <h3 className="block-title">{away.name}</h3>
      {list(match.awayLineup, match.awayId)}
      <div className="subs-line">Zaxira: {(match.awaySubs ?? []).join(', ')}</div>
    </div>
  )
}

function H2HTab({ match }: { match: Match }) {
  const home = teamInfo(match.homeId)
  const away = teamInfo(match.awayId)
  return (
    <div>
      <div className="h2h-summary">
        <div className="h2h-cell"><b>{h2hSummary.homeWins}</b><span>{home.name} g'alabasi</span></div>
        <div className="h2h-cell"><b>{h2hSummary.draws}</b><span>Durang</span></div>
        <div className="h2h-cell"><b>{h2hSummary.awayWins}</b><span>{away.name} g'alabasi</span></div>
      </div>
      <div className="h2h-note">Murabbiylar: {teamById(match.homeId).coach ?? '—'} — {teamById(match.awayId).coach ?? '—'} · Jami uchrashuvlar: {h2hSummary.total}</div>
      <h3 className="block-title">O'tgan uchrashuvlar</h3>
      {h2hPast.map((g, i) => (
        <div className="h2h-row" key={i}>
          <span className="h2h-date">{g.date}</span>
          <span className="h2h-teams">{g.home} — {g.away}</span>
          <b>{g.score}</b>
        </div>
      ))}
    </div>
  )
}

export default function MatchPage({ id }: { id: string }) {
  const nav = useNav()
  const match = matchById(id)
  const league = leagueById(match.leagueId)
  const [mainTab, setMainTab] = useState<'game' | 'h2h' | 'table'>('game')
  const [subTab, setSubTab] = useState<'events' | 'stats' | 'lineups'>('events')

  const statusText =
    match.status === 'live' ? `${match.minute}' — Jonli` :
    match.status === 'halftime' ? 'Tanaffus' :
    match.status === 'finished' ? 'Tugagan' : `Boshlanish: ${match.startTime}`

  const side = (teamId: string, score?: number) => (
    <button className="score-side" onClick={() => nav.openTeam(teamId)}>
      <Crest teamId={teamId} size={54} />
      <span className="score-team">{teamInfo(teamId).name}</span>
      {match.status !== 'scheduled' && <span className="score-num">{score}</span>}
    </button>
  )

  return (
    <div className="page detail">
      <div className="match-league-line"><LeagueLogo leagueId={league.id} size={16} /> {league.name} · {match.dateLabel}</div>
      <div className="scoreboard">
        {side(match.homeId, match.homeScore)}
        <div className="score-center">
          <span className={`score-status${match.status === 'live' || match.status === 'halftime' ? ' live' : ''}`}>{statusText}</span>
          {match.htHome !== undefined && <span className="score-ht">1-bo'lim: {match.htHome}:{match.htAway}</span>}
          <StarBtn active={nav.isFav(match.homeId) || nav.isFav(match.awayId)} onToggle={() => nav.toggleFav(match.homeId)} />
        </div>
        {side(match.awayId, match.awayScore)}
      </div>

      <div className="tabs main">
        {([['game', 'O\'yin'], ['h2h', 'H2H'], ['table', 'Jadval']] as const).map(([k, l]) => (
          <button key={k} className={`tab${mainTab === k ? ' active' : ''}`} onClick={() => setMainTab(k)}>{l}</button>
        ))}
      </div>

      {mainTab === 'game' && (
        <>
          <div className="tabs sub">
            {([['events', 'Voqealar'], ['stats', 'Statistika'], ['lineups', 'Tarkiblar']] as const).map(([k, l]) => (
              <button key={k} className={`tab${subTab === k ? ' active' : ''}`} onClick={() => setSubTab(k)}>{l}</button>
            ))}
          </div>
          {subTab === 'events' && <EventsTab match={match} />}
          {subTab === 'stats' && <StatsTab match={match} />}
          {subTab === 'lineups' && <LineupsTab match={match} />}
        </>
      )}
      {mainTab === 'h2h' && <H2HTab match={match} />}
      {mainTab === 'table' && (
        <StandingsTable rows={standingsFull} highlight={[match.homeId, match.awayId]} onTeam={nav.openTeam} />
      )}
    </div>
  )
}
