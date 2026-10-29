import { useState } from 'react'
import { matches } from '../data/mock'
import { Crest, MatchRow, teamInfo } from '../components'
import { useNav } from '../nav'

const CHIPS = ['Timeline', 'Kecha', 'Jonli'] as const

export default function FavoritesPage() {
  const nav = useNav()
  const [chip, setChip] = useState<(typeof CHIPS)[number]>('Timeline')
  const favs = [...nav.favorites]
  const favMatches = matches.filter((m) => nav.isFav(m.homeId) || nav.isFav(m.awayId))
  const shown = chip === 'Jonli'
    ? favMatches.filter((m) => m.status === 'live' || m.status === 'halftime')
    : chip === 'Kecha'
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
          <div className="fav-empty-star">⭐</div>
          <h3>Sevimli jamoalaringizni qo'shing</h3>
          <p>Sevimli jamoalaringizning barcha o'yinlari va muhim yangiliklari bir joyda bo'ladi.</p>
          <button className="primary-btn" onClick={() => nav.goTab('search')}>🔍 Jamoa qidirish</button>
          <p className="fav-empty-hint">Yoki istalgan jamoa yonidagi ☆ yulduzni bosing</p>
        </div>
      ) : (
        <>
          <div className="fav-teams">
            {favs.map((id) => (
              <button key={id} className="fav-team-chip" onClick={() => nav.openTeam(id)}>
                <Crest teamId={id} size={22} />
                <span>{teamInfo(id).name}</span>
              </button>
            ))}
          </div>
          {shown.length === 0
            ? <div className="empty-note">Bu filtrda sevimli jamoalar o'yini yo'q</div>
            : shown.map((m) => <MatchRow key={m.id} match={m} onOpen={nav.openMatch} />)}
        </>
      )}
    </div>
  )
}
