import { useEffect, useState, type ReactNode } from 'react'
import { fetchMatch, registerTeam, teamInfo, useFetch } from '../api'
import type { LineupPlayer, MatchBundle, MatchEvent } from '../data/types'
import { Crest, ErrorBox, LeagueLogo, MatchSkeleton, RatingPill, StandingsTable, StarBtn, StatBar, useLiveMinute } from '../components'
import { BellButton, useSubs } from '../bell'
import { IconBall, IconCard, IconMapPin, IconSub, IconTarget } from '../icons'
import { useNav } from '../nav'

const EVENT_ICON: Record<MatchEvent['type'], ReactNode> = {
  goal: <IconBall size={16} />,
  'pen-goal': <IconBall size={16} />,
  'pen-missed': <IconTarget size={16} />,
  yellow: <IconCard size={15} color="#FFC531" />,
  red: <IconCard size={15} color="#FF453A" />,
  sub: <IconSub size={16} />,
  chance: <IconTarget size={16} />,
  info: <IconBall size={16} />,
}

const TYPE_LABEL: Record<MatchEvent['type'], string> = {
  goal: 'Gol', 'pen-goal': 'Penaltidan gol', 'pen-missed': "Penalti o'tkazib yuborildi",
  yellow: 'Sariq karta', red: 'Qizil karta', sub: 'Almashtirish', chance: 'Vaziyat', info: 'Voqea',
}

function EventRow({ ev, homeId }: { ev: MatchEvent; homeId: string }) {
  const isHome = ev.teamId === homeId
  return (
    <div className={`event-row${isHome ? '' : ' away'}`}>
      <span className="event-min">{ev.minuteLabel}</span>
      <span className="event-icon">{EVENT_ICON[ev.type]}</span>
      <span className="event-text">
        <b>{ev.player || TYPE_LABEL[ev.type]}</b>
        {ev.note && <small>{ev.note}</small>}
      </span>
    </div>
  )
}

function EventsTab({ bundle }: { bundle: MatchBundle }) {
  const match = bundle.match
  const evs = bundle.events ?? []
  // Bo'limlar: kech bo'lim tepada (FlashScore uslubi)
  const periods: string[] = []
  for (const e of evs) if (!periods.includes(e.period)) periods.push(e.period)
  const ordered = [...periods].reverse()
  const ht = match.htHome !== null && match.htHome !== undefined ? `${match.htHome}:${match.htAway}` : null
  return (
    <div>
      {match.tablo && match.tablo.length > 0 && (
        <div className="tablo-chips">
          {match.tablo.slice(0, 6).map((t) => (
            <span key={t.label} className="tablo-chip"><small>{t.label}</small><b>{Math.round(t.home)} : {Math.round(t.away)}</b></span>
          ))}
        </div>
      )}
      {evs.length === 0 && <div className="empty-note">Bu o'yin uchun voqealar oqimi fidda yo'q</div>}
      {ordered.map((p) => (
        <div key={p}>
          <div className="half-head">{p}{p.startsWith('1') && ht ? ` — ${ht}` : ''}</div>
          {evs.filter((e) => e.period === p).slice().reverse().map((e, i) => (
            <EventRow key={`${e.minuteLabel}-${i}`} ev={e} homeId={match.home.id} />
          ))}
        </div>
      ))}
      <div className="match-meta">
        {bundle.meta.venue && <span><IconMapPin size={13} /> {bundle.meta.venue}{bundle.meta.capacity ? ` (${bundle.meta.capacity})` : ''}</span>}
        {bundle.meta.referee && <span>Hakam: {bundle.meta.referee}</span>}
        {bundle.meta.stage && <span>{bundle.meta.stage}</span>}
        {bundle.meta.temperature && <span>{bundle.meta.temperature}</span>}
      </div>
    </div>
  )
}

function StatsTab({ bundle }: { bundle: MatchBundle }) {
  const stats = bundle.stats
  const available = (['all', 'h1', 'h2'] as const).filter((k) => stats && stats[k] && stats[k]!.length > 0)
  const [period, setPeriod] = useState<'all' | 'h1' | 'h2'>('all')
  if (!stats || available.length === 0) {
    return <div className="empty-note">Statistika bu o'yin uchun fidda hali yo'q</div>
  }
  const current = available.includes(period) ? period : available[0]
  const labels = { all: "Butun o'yin", h1: "1-bo'lim", h2: "2-bo'lim" } as const
  return (
    <div>
      {available.length > 1 && (
        <div className="chips small">
          {available.map((k) => (
            <button key={k} className={`chip${current === k ? ' active' : ''}`} onClick={() => setPeriod(k)}>{labels[k]}</button>
          ))}
        </div>
      )}
      <div className="stats-list">
        {stats[current]!.map((s) => <StatBar key={s.label} line={s} />)}
      </div>
    </div>
  )
}

function Pitch({ bundle }: { bundle: MatchBundle }) {
  const lu = bundle.lineups!
  if (!lu.home.hasPositions || !lu.away.hasPositions) return null
  const renderTeam = (players: LineupPlayer[], isHome: boolean, teamId: string) => {
    const crest = teamInfo(teamId).crestUrl
    return players.map((p) => {
      if (p.x === undefined || p.y === undefined) return null
      const x = isHome ? p.x : 100 - p.x
      const top = isHome ? 5 + (p.y / 2) * 0.9 : 95 - (p.y / 2) * 0.9
      return (
        <div key={p.id} className="pitch-player" style={{ left: `${x}%`, top: `${top}%` }}>
          {crest ? (
            <span className="pitch-dotwrap">
              <img className="pitch-crest" src={crest} alt="" />
              <span className="pitch-num">{p.number}</span>
            </span>
          ) : (
            <span className={`pitch-dot${isHome ? ' home' : ' away'}`}>{p.number}</span>
          )}
          <span className="pitch-name">{(p.shortName || p.name.split(' ').slice(-1)[0])}</span>
          {p.rating !== undefined && <RatingPill value={p.rating} />}
        </div>
      )
    })
  }
  return (
    <div className="pitch">
      <div className="pitch-line mid" /><div className="pitch-circle" />
      <div className="pitch-line box-top" /><div className="pitch-line box-bottom" />
      {renderTeam(lu.home.players, true, lu.home.teamId || bundle.match.home.id)}
      {renderTeam(lu.away.players, false, lu.away.teamId || bundle.match.away.id)}
    </div>
  )
}

function LineupsTab({ bundle }: { bundle: MatchBundle }) {
  const nav = useNav()
  const lu = bundle.lineups
  const match = bundle.match
  if (!lu) return <div className="empty-note">Tarkiblar fidda hali e'lon qilinmadi</div>
  const list = (players: LineupPlayer[], teamName: string) => (
    <div className="lineup-list">
      {players.map((p) => (
        <button
          key={p.id}
          className="lineup-row"
          onClick={() => nav.openPlayer(`${match.id}:${p.id}`)}
        >
          {p.photo
            ? <img className="lineup-photo" src={p.photo} alt="" loading="lazy" />
            : <span className="lineup-num">{p.number}</span>}
          <span className="lineup-name">
            <span className="lineup-name-line">{p.name}</span>
            <small>{teamName}{p.pos ? ` · ${p.pos}` : ''}{p.number ? ` · #${p.number}` : ''}</small>
          </span>
          {p.rating !== undefined && <RatingPill value={p.rating} />}
        </button>
      ))}
    </div>
  )
  const side = (s: typeof lu.home, name: string) => (
    <>
      <h3 className="block-title">{name}{s.coach ? <small className="coach-note"> · Murabbiy: {s.coach}</small> : null}</h3>
      {list(s.players, name)}
      {s.subs.length > 0 && (
        <div className="subs-line">Zaxira: {s.subs.map((x) => (x.number ? `${x.name} (${x.number})` : x.name)).join(', ')}</div>
      )}
    </>
  )
  return (
    <div>
      {(lu.home.formation || lu.away.formation) && (
        <div className="formation-head">
          <span><Crest teamId={match.home.id} size={20} /> {lu.home.formation ?? '—'}</span>
          <span className="formation-vs">—</span>
          <span>{lu.away.formation ?? '—'} <Crest teamId={match.away.id} size={20} /></span>
        </div>
      )}
      <Pitch bundle={bundle} />
      {side(lu.home, match.home.name)}
      {side(lu.away, match.away.name)}
    </div>
  )
}

function H2HTab({ bundle }: { bundle: MatchBundle }) {
  const h = bundle.h2h
  const match = bundle.match
  if (!h) return <div className="empty-note">H2H ma'lumoti fidda yo'q</div>
  return (
    <div>
      <div className="h2h-summary">
        <div className="h2h-cell"><b>{h.homeWins}</b><span>{match.home.name} g'alabasi</span></div>
        <div className="h2h-cell"><b>{h.draws}</b><span>Durang</span></div>
        <div className="h2h-cell"><b>{h.awayWins}</b><span>{match.away.name} g'alabasi</span></div>
      </div>
      <div className="h2h-note">Jami uchrashuvlar: {h.total}</div>
      <h3 className="block-title">O'tgan uchrashuvlar</h3>
      {h.past.length === 0 && <div className="empty-note">O'tgan uchrashuvlar topilmadi</div>}
      {h.past.map((g, i) => (
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
  const subs = useSubs()
  const [mainTab, setMainTab] = useState<'game' | 'h2h' | 'table'>('game')
  const [subTab, setSubTab] = useState<'events' | 'stats' | 'lineups'>('events')
  // Polling: jonli/tanaffus — 5s (BetGO web darajasida), tugagan/rejadagi — 60s
  const [pollMs, setPollMs] = useState(5000)
  const { data: bundle, error, loading, reload } = useFetch(() => fetchMatch(id), [id], pollMs)
  const status = bundle?.match.status
  useEffect(() => {
    if (!status) return
    setPollMs(status === 'live' || status === 'halftime' ? 5000 : 60000)
  }, [status])
  const liveMinute = useLiveMinute(bundle?.match ?? null)

  if (bundle) {
    registerTeam(bundle.match.home)
    registerTeam(bundle.match.away)
    if (bundle.table) for (const g of bundle.table.groups) for (const r of g.rows) registerTeam(r.team)
  }

  if (loading) return <div className="page detail"><MatchSkeleton main={mainTab} sub={subTab} /></div>
  if (error || !bundle) return <div className="page detail"><ErrorBox onRetry={reload} /></div>

  const match = bundle.match
  const statusText =
    match.status === 'live' ? `${liveMinute ?? match.minute ?? 0}' — Jonli` :
    match.status === 'halftime' ? 'Tanaffus' :
    match.status === 'finished' ? 'Tugagan' : `Boshlanish: ${match.startTime}`

  const side = (team: typeof match.home, score?: number | null) => (
    <button className="score-side" onClick={() => nav.openTeam(team.id)}>
      <Crest teamId={team.id} size={54} />
      <span className="score-team">{team.name}</span>
      {match.status !== 'scheduled' && <span key={score ?? ''} className="score-num pop">{score ?? ''}</span>}
    </button>
  )

  return (
    <div className="page detail">
      <div className="match-league-line">
        {match.leagueId && !match.leagueId.startsWith('res-') ? (
          <button className="match-league-link" onClick={() => nav.openLeague(match.leagueId)}>
            <LeagueLogo leagueId={match.leagueId} size={16} />
            <span className="mll-name">{match.leagueName}</span>
            <span className="mll-date">· {match.dateLabel}</span>
            <span className="mll-arrow">›</span>
          </button>
        ) : (
          <span className="match-league-static">
            <LeagueLogo leagueId={match.leagueId} size={16} />
            <span className="mll-name">{match.leagueName}</span>
            <span className="mll-date">· {match.dateLabel}</span>
          </span>
        )}
      </div>
      <div className="scoreboard">
        {side(match.home, match.homeScore)}
        <div className="score-center">
          <span className={`score-status${match.status === 'live' || match.status === 'halftime' ? ' live' : ''}`}>{statusText}</span>
          {match.htHome !== null && match.htHome !== undefined && <span className="score-ht">1-bo'lim: {match.htHome}:{match.htAway}</span>}
          <div className="score-actions">
            <StarBtn active={nav.isFav(match.home.id)} onToggle={() => nav.toggleFav(match.home)} />
            <BellButton match={match} size={21} />
          </div>
        </div>
        {side(match.away, match.awayScore)}
      </div>
      {subs.isSub(match.id) && subs.deliverable(match.id) === false && (
        <div className="sub-note">Xabar kelishi uchun @golpulse_bot da /start bosing</div>
      )}

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
          {subTab === 'events' && <EventsTab bundle={bundle} />}
          {subTab === 'stats' && <StatsTab bundle={bundle} />}
          {subTab === 'lineups' && <LineupsTab bundle={bundle} />}
        </>
      )}
      {mainTab === 'h2h' && <H2HTab bundle={bundle} />}
      {mainTab === 'table' && (
        bundle.table
          ? bundle.table.groups.map((g) => (
            <div key={g.name || 'main'}>
              {g.name && <h3 className="block-title">{g.name}</h3>}
              <StandingsTable rows={g.rows} highlight={[match.home.id, match.away.id]} onTeam={nav.openTeam} />
            </div>
          ))
          : <div className="empty-note">Bu turnir uchun jadval fidda yo'q (kubok formati bo'lishi mumkin)</div>
      )}
    </div>
  )
}
