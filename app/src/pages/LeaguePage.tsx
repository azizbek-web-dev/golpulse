import { useState } from 'react'
import { fetchLeague, fetchTable, registerLeague, registerTeam, useFetch } from '../api'
import { ErrorBox, LeagueLogo, MatchRow, Skeleton, StandingsTable } from '../components'
import { useNav } from '../nav'

function TableSection({ gameId, onTeam }: { gameId: string; onTeam: (id: string) => void }) {
  const { data, error, loading, reload } = useFetch(() => fetchTable(gameId), [gameId])
  if (data) for (const g of data.groups) for (const r of g.rows) registerTeam(r.team)
  if (loading) return <Skeleton rows={6} />
  if (error) return <ErrorBox onRetry={reload} />
  if (!data) return <div className="empty-note">Bu liga uchun jadval fidda yo'q</div>
  return (
    <>
      {data.groups.map((g) => (
        <div key={g.name || 'main'}>
          {g.name && <h3 className="block-title">{g.name}</h3>}
          <StandingsTable rows={g.rows} onTeam={onTeam} />
        </div>
      ))}
    </>
  )
}

export default function LeaguePage({ id }: { id: string }) {
  const nav = useNav()
  const [tab, setTab] = useState<'games' | 'results' | 'table'>('games')
  const { data, error, loading, reload } = useFetch(() => fetchLeague(id), [id], 30000)

  if (data) {
    registerLeague(data.league)
    for (const m of [...data.games, ...(data.lastGames ?? [])]) { registerTeam(m.home); registerTeam(m.away) }
  }

  if (loading) return <div className="page detail"><Skeleton rows={6} /></div>
  if (error || !data) return <div className="page detail"><ErrorBox onRetry={reload} /></div>

  const league = data.league
  return (
    <div className="page detail">
      <div className="league-hero">
        <LeagueLogo leagueId={id} league={league} size={52} />
        <div>
          <h2>{league.name}</h2>
          <div className="league-hero-sub">{[league.country, data.games.length ? `${data.games.length} o'yin liniyada` : ''].filter(Boolean).join(' · ')}</div>
        </div>
      </div>

      <div className="tabs main">
        {([['games', 'O\'yinlar'], ['results', 'Natijalar'], ['table', 'Jadval']] as const).map(([k, l]) => (
          <button key={k} className={`tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'table' && (
        data.tableGameId
          ? <TableSection gameId={data.tableGameId} onTeam={nav.openTeam} />
          : <div className="empty-note">Bu liga uchun jadval hozircha mavjud emas</div>
      )}
      {tab === 'games' && (
        data.games.length === 0
          ? <div className="empty-note">Yaqin o'yinlar liniyada yo'q</div>
          : data.games.map((m) => <MatchRow key={m.id} match={m} onOpen={nav.openMatch} />)
      )}
      {tab === 'results' && (
        !data.lastGames || data.lastGames.length === 0
          ? <div className="empty-note">Oxirgi natijalar topilmadi</div>
          : data.lastGames.map((m) => <MatchRow key={m.id} match={m} onOpen={nav.openMatch} />)
      )}
    </div>
  )
}
