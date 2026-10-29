import { useMemo, useState } from 'react'
import { leagues, players, teams } from '../data/mock'
import { Crest, StarBtn } from '../components'
import { useNav } from '../nav'

const norm = (s: string) => s.toLowerCase().replace(/[''`]/g, '')

export default function SearchPage() {
  const nav = useNav()
  const [q, setQ] = useState('')
  const query = norm(q.trim())

  const foundTeams = useMemo(
    () => (query ? teams.filter((t) => norm(t.name).includes(query)) : []),
    [query],
  )
  const foundPlayers = useMemo(
    () => (query ? players.filter((p) => norm(p.name).includes(query)) : []),
    [query],
  )
  const foundLeagues = useMemo(
    () => (query ? leagues.filter((l) => norm(l.name).includes(query) || norm(l.country).includes(query)) : []),
    [query],
  )
  const nothing = query && foundTeams.length + foundPlayers.length + foundLeagues.length === 0
  const popular = ['ars', 'rma', 'pak']

  const teamRow = (t: (typeof teams)[number]) => (
    <div className="search-row" key={t.id}>
      <button className="search-row-main" onClick={() => nav.openTeam(t.id)}>
        <Crest teamId={t.id} size={30} />
        <span><b>{t.name}</b><small>Futbol, {t.leagueId === 'epl' ? 'Angliya' : ''}</small></span>
      </button>
      <StarBtn active={nav.isFav(t.id)} onToggle={() => nav.toggleFav(t.id)} />
    </div>
  )

  return (
    <div className="page">
      <div className="search-box">
        <span>🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Jamoa, o'yinchi yoki liga qidiring"
          autoFocus
        />
        {q && <button className="icon-btn" onClick={() => setQ('')}>✕</button>}
      </div>

      {!query && (
        <>
          <div className="section-label">Mashhur jamoalar</div>
          {popular.map((id) => teamRow(teams.find((t) => t.id === id)!))}
          <div className="section-label">Mashhur ligalar</div>
          {leagues.slice(0, 3).map((l) => (
            <button key={l.id} className="search-row-main full" onClick={() => nav.openLeague(l.id)}>
              <span className="league-flag big">{l.flag}</span>
              <span><b>{l.name}</b><small>{l.country}</small></span>
            </button>
          ))}
        </>
      )}

      {nothing && <div className="empty-note">«{q}» bo'yicha hech narsa topilmadi</div>}

      {foundLeagues.length > 0 && (
        <>
          <div className="section-label">Ligalar</div>
          {foundLeagues.map((l) => (
            <button key={l.id} className="search-row-main full" onClick={() => nav.openLeague(l.id)}>
              <span className="league-flag big">{l.flag}</span>
              <span><b>{l.name}</b><small>{l.country}</small></span>
            </button>
          ))}
        </>
      )}
      {foundTeams.length > 0 && (
        <>
          <div className="section-label">Jamoalar</div>
          {foundTeams.map(teamRow)}
        </>
      )}
      {foundPlayers.length > 0 && (
        <>
          <div className="section-label">O'yinchilar</div>
          {foundPlayers.map((p) => (
            <button key={p.id} className="search-row-main full" onClick={() => nav.openPlayer(p.id)}>
              <span className="avatar">{p.initials}</span>
              <span><b>{p.name}</b><small>{p.position}</small></span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}
