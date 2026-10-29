import { fetchTeam, registerTeam, useFetch } from '../api'
import type { TeamGameRow } from '../data/types'
import { Crest, ErrorBox, MatchRow, Skeleton, StarBtn } from '../components'
import { IconChevronRight } from '../icons'
import { useNav } from '../nav'

const RESULT_BADGE = { W: 'G', D: 'D', L: 'M' } as const

export function RecentRow({ g }: { g: TeamGameRow }) {
  return (
    <div className="h2h-row">
      {g.result && <span className={`result-badge ${g.result}`}>{RESULT_BADGE[g.result]}</span>}
      <span className="h2h-date">{g.date}</span>
      <span className="h2h-teams">{g.home} — {g.away}</span>
      <b>{g.score ?? '—'}</b>
    </div>
  )
}

export default function TeamPage({ id }: { id: string }) {
  const nav = useNav()
  const { data, error, loading, reload } = useFetch(() => fetchTeam(id), [id])
  if (data) {
    registerTeam(data.team)
    if (data.nextMatch) { registerTeam(data.nextMatch.home); registerTeam(data.nextMatch.away) }
  }

  if (loading) return <div className="page detail"><Skeleton rows={6} /></div>
  if (error || !data) {
    return (
      <div className="page detail">
        <div className="empty-note">Jamoa ma'lumoti topilmadi — bu jamoa bugungi fidda bo'lmasligi mumkin</div>
        <ErrorBox onRetry={reload} />
      </div>
    )
  }

  const team = data.team
  const initials = team.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="page detail">
      <div className="team-hero">
        <Crest teamId={id} size={64} />
        <div className="team-hero-main">
          <h2>{team.name}</h2>
          <div className="team-hero-sub">{data.league.name}</div>
        </div>
        <StarBtn active={nav.isFav(id)} onToggle={() => nav.toggleFav(team)} />
      </div>

      <div className="meta-card">
        {data.coach && <div className="meta-row"><span>Murabbiy</span><b>{data.coach}</b></div>}
        <div className="meta-row"><span>Liga</span><b>{data.league.name}</b></div>
      </div>

      {data.nextMatch && (
        <>
          <h3 className="block-title">Keyingi o'yin</h3>
          <MatchRow match={data.nextMatch} onOpen={nav.openMatch} />
        </>
      )}
      {data.recent.length > 0 && (
        <>
          <h3 className="block-title">Oxirgi o'yinlar</h3>
          {data.recent.map((g, i) => <RecentRow key={i} g={g} />)}
        </>
      )}
      {data.squad.length > 0 && (
        <>
          <h3 className="block-title">Tarkib</h3>
          {data.squad.map((p) => (
            <button key={p.id} className="player-row" onClick={() => nav.openPlayer(`${data.repGameId}:${p.id}`)}>
              {p.photo
                ? <img className="avatar-img" src={p.photo} alt="" loading="lazy" />
                : <span className="avatar">{initials}</span>}
              <span className="player-row-main"><b>{p.name}</b><small>{p.country}</small></span>
              <IconChevronRight size={19} className="row-chevron" />
            </button>
          ))}
        </>
      )}
    </div>
  )
}
