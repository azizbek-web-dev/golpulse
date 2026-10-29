import { useState } from 'react'
import { leagueById, matchesByLeague, standingsFull } from '../data/mock'
import { MatchRow, StandingsTable } from '../components'
import { useNav } from '../nav'

export default function LeaguePage({ id }: { id: string }) {
  const nav = useNav()
  const league = leagueById(id)
  const [tab, setTab] = useState<'games' | 'results' | 'table'>('games')
  const games = matchesByLeague(id)
  const shown = tab === 'results' ? games.filter((m) => m.status === 'finished') : games

  return (
    <div className="page detail">
      <div className="league-hero">
        <span className="league-flag hero">{league.flag}</span>
        <div>
          <h2>{league.name}</h2>
          <div className="league-hero-sub">{league.country} · Mavsum {league.season}{league.followers ? ` · ${league.followers} kuzatuvchi` : ''}</div>
        </div>
      </div>
      <div className="season-progress">
        <div className="season-progress-bar"><i style={{ width: `${league.progress * 100}%` }} /></div>
        <span>Mavsum: {Math.round(league.progress * 100)}% o'tdi</span>
      </div>

      <div className="tabs main">
        {([['games', 'O\'yinlar'], ['results', 'Natijalar'], ['table', 'Jadval']] as const).map(([k, l]) => (
          <button key={k} className={`tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'table' ? (
        id === 'epl'
          ? <StandingsTable rows={standingsFull} onTeam={nav.openTeam} />
          : <div className="empty-note">Namuna UI: to'liq jadval hozircha Premier League uchun tayyor</div>
      ) : (
        shown.length === 0
          ? <div className="empty-note">Bu bo'limda o'yinlar yo'q</div>
          : shown.map((m) => <MatchRow key={m.id} match={m} onOpen={nav.openMatch} />)
      )}
    </div>
  )
}
