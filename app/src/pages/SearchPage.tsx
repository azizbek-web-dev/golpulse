import { useEffect, useState } from 'react'
import { fetchSearch, registerLeague, registerTeam, useFetch } from '../api'
import { Crest, LeagueLogo, MatchRow, Skeleton, StarBtn } from '../components'
import { IconSearch, IconX } from '../icons'
import { useNav } from '../nav'

const POPULAR = ['Arsenal', 'Real Madrid', 'Liverpul', 'Barselona', 'Paxtakor', 'Chelsi']

export default function SearchPage() {
  const nav = useNav()
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 400)
    return () => window.clearTimeout(t)
  }, [q])

  const active = debounced.length >= 2
  const { data, error, loading } = useFetch(
    () => (active ? fetchSearch(debounced) : Promise.resolve(null)),
    [debounced, active],
  )

  if (data) {
    for (const t of data.teams) registerTeam(t)
    for (const l of data.leagues) registerLeague(l)
    for (const m of data.matches) { registerTeam(m.home); registerTeam(m.away) }
  }

  const nothing = active && data && !loading &&
    data.teams.length + data.leagues.length + data.matches.length === 0

  return (
    <div className="page">
      <div className="search-box">
        <span className="search-icon"><IconSearch size={18} /></span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Jamoa, liga yoki o'yin qidiring"
          autoFocus
        />
        {q && <button className="icon-btn" onClick={() => setQ('')}><IconX size={16} /></button>}
      </div>

      {!active && (
        <>
          <div className="section-label">Mashhur so'rovlar</div>
          <div className="fav-teams">
            {POPULAR.map((name) => (
              <button key={name} className="fav-team-chip" onClick={() => setQ(name)}><span>{name}</span></button>
            ))}
          </div>
          <p className="fav-empty-hint">Qidiruv bugungi va yaqin o'yinlar fididan ishlaydi</p>
        </>
      )}

      {active && loading && <Skeleton rows={3} />}
      {active && error && <div className="empty-note">Qidiruvda xatolik — qayta yozib ko'ring</div>}
      {nothing && <div className="empty-note">«{debounced}» bo'yicha hech narsa topilmadi</div>}

      {data && data.leagues.length > 0 && (
        <>
          <div className="section-label">Ligalar</div>
          {data.leagues.map((l) => (
            <button key={l.id} className="search-row-main full" onClick={() => nav.openLeague(l.id)}>
              <LeagueLogo leagueId={l.id} league={l} size={32} />
              <span><b>{l.name}</b><small>{l.country}</small></span>
            </button>
          ))}
        </>
      )}
      {data && data.teams.length > 0 && (
        <>
          <div className="section-label">Jamoalar</div>
          {data.teams.map((t) => (
            <div className="search-row" key={t.id}>
              <button className="search-row-main" onClick={() => nav.openTeam(t.id)}>
                <Crest teamId={t.id} size={30} />
                <span><b>{t.name}</b><small>{t.leagueName}</small></span>
              </button>
              <StarBtn active={nav.isFav(t.id)} onToggle={() => nav.toggleFav(t)} />
            </div>
          ))}
        </>
      )}
      {data && data.matches.length > 0 && (
        <>
          <div className="section-label">O'yinlar</div>
          {data.matches.map((m) => <MatchRow key={m.id} match={m} onOpen={nav.openMatch} />)}
        </>
      )}
    </div>
  )
}
