import { useEffect, useState, type ReactNode } from 'react'
import { fetchMatch, registerTeam, teamInfo, useFetch } from '../api'
import type { LineupPlayer, MatchBundle, MatchEvent, StandingRow } from '../data/types'
import { Crest, ErrorBox, LeagueLogo, MatchSkeleton, RatingPill, StandingsTable, StarBtn, StatBar, useLiveSeconds } from '../components'
import { BellButton, useSubs } from '../bell'
import { IconBall, IconCalendar, IconCard, IconCloud, IconFlag, IconMapPin, IconSub, IconTarget, IconThermometer, IconUser, IconUsers } from '../icons'
import { useNav } from '../nav'

/** Jonli soat formati: mm:ss (daqiqa 2 xonali) */
function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

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

/**
 * Davr hisobi — avval taxta ma'lumoti (fid voqealari ba'zan to'liq bo'lmaydi):
 * 1-bo'lim = HT hisobi, 2-bo'lim = umumiy − HT; bo'lmasa voqealardagi gollar yig'indisi.
 */
function periodScore(bundle: MatchBundle, period: string, evs: MatchEvent[]): [number, number] {
  const m = bundle.match
  const hasHt = m.htHome !== null && m.htHome !== undefined && m.htAway !== null && m.htAway !== undefined
  if (period.startsWith('1') && hasHt) return [m.htHome!, m.htAway!]
  if (period.startsWith('2') && hasHt && m.homeScore != null && m.awayScore != null) {
    return [m.homeScore - m.htHome!, m.awayScore - m.htAway!]
  }
  let h = 0, a = 0
  for (const e of evs) {
    if (e.period !== period) continue
    if (e.type === 'goal' || e.type === 'pen-goal') { if (e.teamId === m.home.id) h++; else a++ }
  }
  return [h, a]
}

/** Ma'lumot kartasi — ikonkali tartibli qatorlar (SofaScore info kartasi uslubi) */
function InfoCard({ bundle }: { bundle: MatchBundle }) {
  const { match, meta } = bundle
  const venue = meta.venue ? meta.venue.replace(/^\s*Stadion:\s*/i, '').trim() : null
  const capNum = meta.capacity ? Number(String(meta.capacity).replace(/[^\d]/g, '')) : null
  const rows: Array<{ icon: ReactNode; label: string; value: string }> = [
    { icon: <IconCalendar size={16} />, label: 'Sana va vaqt', value: `${match.dateLabel} · ${match.startTime}` },
  ]
  if (venue) rows.push({ icon: <IconMapPin size={16} />, label: 'Stadion', value: venue })
  if (capNum) rows.push({ icon: <IconUsers size={16} />, label: "Sig'imi", value: capNum.toLocaleString('ru-RU') })
  if (meta.referee) rows.push({ icon: <IconUser size={16} />, label: 'Hakam', value: meta.referee })
  if (meta.stage) rows.push({ icon: <IconFlag size={16} />, label: 'Bosqich', value: meta.stage })
  if (meta.temperature) rows.push({ icon: <IconThermometer size={16} />, label: 'Harorat', value: meta.temperature })
  if (meta.weather) rows.push({ icon: <IconCloud size={16} />, label: 'Ob-havo', value: meta.weather })
  return (
    <>
      <h3 className="block-title">Ma'lumot</h3>
      <div className="info-card">
        {rows.map((r) => (
          <div className="info-row" key={r.label}>
            <span className="info-icon">{r.icon}</span>
            <span className="info-label">{r.label}</span>
            <span className="info-value">{r.value}</span>
          </div>
        ))}
      </div>
    </>
  )
}

/** Jamoa formasi — ikki jamoaning oxirgi 5 o'yini, ikki ustunda */
function FormBlock({ bundle }: { bundle: MatchBundle }) {
  const h = bundle.h2h
  const match = bundle.match
  if (!h) return null
  const cols = [
    { team: match.home, rows: h.homeRecent ?? [] },
    { team: match.away, rows: h.awayRecent ?? [] },
  ].map((c) => ({ ...c, rows: c.rows.filter((g) => g.score && g.result).slice(0, 5) }))
  if (cols.every((c) => c.rows.length === 0)) return null
  return (
    <>
      <h3 className="block-title">Jamoa formasi</h3>
      <div className="form-cols">
        {cols.map((c) => (
          <div className="form-col" key={c.team.id}>
            <div className="form-col-head"><Crest teamId={c.team.id} size={20} /><span>{c.team.name}</span></div>
            {c.rows.map((g, i) => {
              const isHome = g.homeId === c.team.id
              const oppId = isHome ? g.awayId : g.homeId
              const oppName = isHome ? g.away : g.home
              const [s1, s2] = (g.score ?? '').split(':').map((x) => parseInt(x, 10))
              const mine = isHome ? s1 : s2
              const opp = isHome ? s2 : s1
              return (
                <div className="form-row" key={`${g.dateTs}-${i}`}>
                  <Crest teamId={oppId} size={18} />
                  <span className="form-opp">{oppName}</span>
                  <span className={`form-chip ${g.result!.toLowerCase()}`}>{mine}:{opp}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}

/** Mini-jadval — faqat ikki jamoaning qatorlari + to'liq jadvalga havola */
function MiniTable({ bundle, onShowTable }: { bundle: MatchBundle; onShowTable: () => void }) {
  const nav = useNav()
  const t = bundle.table
  const match = bundle.match
  if (!t) return null
  const ids = [match.home.id, match.away.id]
  let rows: StandingRow[] = []
  for (const g of t.groups) {
    const f = g.rows.filter((r) => ids.includes(r.team.id))
    if (f.length) { rows = f; break }
  }
  if (rows.length === 0) return null
  rows = [...rows].sort((a, b) => a.pos - b.pos)
  const diff = (goals: string) => {
    const [gf, ga] = goals.split(':').map((x) => parseInt(x, 10))
    if (Number.isNaN(gf) || Number.isNaN(ga)) return goals
    const d = gf - ga
    return d > 0 ? `+${d}` : `${d}`
  }
  return (
    <>
      <h3 className="block-title">Jadval</h3>
      <table className="standings mini">
        <thead>
          <tr><th className="c-pos">#</th><th className="c-team">Jamoa</th><th>O'</th><th>Farq</th><th className="c-pts">Och</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team.id} className="hl">
              <td className="c-pos"><span className="pos-box">{r.pos}</span></td>
              <td className="c-team">
                <button className="team-cell" onClick={() => nav.openTeam(r.team.id)}>
                  <Crest teamId={r.team.id} size={20} />
                  <span className="team-cell-name">{r.team.name}</span>
                </button>
              </td>
              <td>{r.played}</td>
              <td>{diff(r.goals)}</td>
              <td className="c-pts">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="mini-table-link" onClick={onShowTable}>To'liq jadval</button>
    </>
  )
}

function EventsTab({ bundle, onShowTable }: { bundle: MatchBundle; onShowTable: () => void }) {
  const match = bundle.match
  const evs = bundle.events ?? []
  // Bo'limlar: kech bo'lim tepada (FlashScore uslubi)
  const periods: string[] = []
  for (const e of evs) if (!periods.includes(e.period)) periods.push(e.period)
  const ordered = [...periods].reverse()
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
      {ordered.map((p) => {
        const [ph, pa] = periodScore(bundle, p, evs)
        return (
          <div key={p}>
            <div className="half-head"><span>{p} · {ph}–{pa}</span></div>
            {evs.filter((e) => e.period === p).slice().reverse().map((e, i) => (
              <EventRow key={`${e.minuteLabel}-${i}`} ev={e} homeId={match.home.id} />
            ))}
          </div>
        )
      })}
      <InfoCard bundle={bundle} />
      <FormBlock bundle={bundle} />
      <MiniTable bundle={bundle} onShowTable={onShowTable} />
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
  const liveSec = useLiveSeconds(bundle?.match ?? null)

  if (bundle) {
    registerTeam(bundle.match.home)
    registerTeam(bundle.match.away)
    if (bundle.table) for (const g of bundle.table.groups) for (const r of g.rows) registerTeam(r.team)
    if (bundle.h2h) {
      // Forma/H2H qatorlaridagi raqiblar — gerblari bilan registrga (Crest shundan o'qiydi)
      for (const g of [...bundle.h2h.past, ...bundle.h2h.homeRecent, ...bundle.h2h.awayRecent]) {
        registerTeam({ id: g.homeId, name: g.home, short: '', crestUrl: g.homeCrestUrl ?? null })
        registerTeam({ id: g.awayId, name: g.away, short: '', crestUrl: g.awayCrestUrl ?? null })
      }
    }
  }

  if (loading) return <div className="page detail"><MatchSkeleton main={mainTab} sub={subTab} /></div>
  if (error || !bundle) return <div className="page detail"><ErrorBox onRetry={reload} /></div>

  const match = bundle.match
  const statusText =
    match.status === 'live' ? (liveSec !== null ? fmtClock(liveSec) : `${match.minute ?? 0}' — Jonli`) :
    match.status === 'halftime' ? 'Tanaffus' :
    match.status === 'finished' ? 'Tugagan' : `Boshlanish: ${match.startTime}`

  // Gol mualliflari — taxta ostida, har jamoa o'z tomonida (SofaScore uslubi)
  const goalEvents = (bundle.events ?? []).filter((e) => e.type === 'goal' || e.type === 'pen-goal')
  const homeGoals = goalEvents.filter((e) => e.teamId === match.home.id)
  const awayGoals = goalEvents.filter((e) => e.teamId === match.away.id)
  const scorerCol = (list: MatchEvent[], away: boolean) => (
    <div className={`scorers-col${away ? ' away' : ''}`}>
      {list.map((e, i) => (
        <div className="scorer" key={`${e.minuteLabel}-${i}`}>
          <span className="scorer-main">
            <IconBall size={13} />
            <span className="scorer-name">{e.player}</span>
            <span className="scorer-min">{e.minuteLabel}{e.type === 'pen-goal' ? ' (pen)' : ''}</span>
          </span>
          {e.note && <small className="scorer-note">{e.note}</small>}
        </div>
      ))}
    </div>
  )

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
            <span className="mll-top">
              <LeagueLogo leagueId={match.leagueId} size={16} />
              <span className="mll-name">{match.leagueName}</span>
            </span>
            <span className="mll-date">{match.dateLabel}</span>
          </button>
        ) : (
          <span className="match-league-static">
            <span className="mll-top">
              <LeagueLogo leagueId={match.leagueId} size={16} />
              <span className="mll-name">{match.leagueName}</span>
            </span>
            <span className="mll-date">{match.dateLabel}</span>
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
      {(homeGoals.length > 0 || awayGoals.length > 0) && (
        <div className="score-scorers">
          {scorerCol(homeGoals, false)}
          {scorerCol(awayGoals, true)}
        </div>
      )}
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
          {subTab === 'events' && <EventsTab bundle={bundle} onShowTable={() => setMainTab('table')} />}
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
