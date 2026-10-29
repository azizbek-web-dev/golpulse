import { useState } from 'react'
import { fetchLive, registerTeam, teamInfo, useFetch } from '../api'
import type { ApiMatch } from '../data/types'
import { Crest, ErrorBox, MatchRow, Skeleton } from '../components'
import { IconSearch, IconStar } from '../icons'
import { useNav } from '../nav'

const CHIPS = ['Timeline', 'Tugagan', 'Jonli'] as const

export default function FavoritesPage() {
  const nav = useNav()
  const [chip, setChip] = useState<(typeof CHIPS)[number]>('Timeline')
  const favs = [...nav.favorites]
  const { data, error, loading, reload } = useFetch(fetchLive, [], 5000)

  if (data) for (const g of data.leagues) for (const m of g.games) { registerTeam(m.home); registerTeam(m.away) }

  const favMatches: ApiMatch[] = data
    ? data.leagues.flatMap((g) => g.games).filter((m) => nav.isFav(m.home.id) || nav.isFav(m.away.id))
    : []
  const shown = chip === 'Jonli'
    ? favMatches.filter((m) => m.status === 'live' || m.status === 'halftime')
    : chip === 'Tugagan'
      ? favMatches.filter((m) => m.status === 'finished')
      : favMatches

  return (
    <div className="page">
      <h2 className="page-title">Sevimlilar</h2>
      <div className="chips">
        {CHIPS.map((c) => (
          <button key={c} className={`chip${chip === c ? ' active' : ''}`} onClick={() => setChip(c)}>{c}</button>
        ))}
      </div>

      {favs.length === 0 ? (
        <div className="fav-empty">
          <div className="fav-empty-star"><IconStar size={52} filled /></div>
          <h3>Sevimli jamoalaringizni qo'shing</h3>
          <p>Sevimli jamoalaringizning barcha o'yinlari va muhim yangiliklari bir joyda bo'ladi.</p>
          <button className="primary-btn" onClick={() => nav.goTab('search')}><IconSearch size={16} /> Jamoa qidirish</button>
          <p className="fav-empty-hint">Yoki istalgan jamoa yonidagi yulduz belgisini bosing</p>
        </div>
      ) : (
        <>
          <div className="fav-teams">
            {favs.map((id) => {
              const stub = nav.favTeam(id)
              return (
                <button key={id} className="fav-team-chip" onClick={() => nav.openTeam(id)}>
                  <Crest teamId={id} size={22} />
                  <span>{stub?.name ?? teamInfo(id).name}</span>
                </button>
              )
            })}
          </div>
          {loading && <Skeleton rows={3} />}
          {error && !data && <ErrorBox onRetry={reload} />}
          {data && (shown.length === 0
            ? <div className="empty-note">Bu filtrda sevimli jamoalar o'yini yo'q</div>
            : shown.map((m) => <MatchRow key={m.id} match={m} onOpen={nav.openMatch} />))}
        </>
      )}
    </div>
  )
}
