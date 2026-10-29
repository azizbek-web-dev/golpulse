import { teamById, teamMatches, players, leagueById } from '../data/mock'
import { Crest, MatchRow, StarBtn } from '../components'
import { useNav } from '../nav'

export default function TeamPage({ id }: { id: string }) {
  const nav = useNav()
  const team = teamById(id)
  const games = teamMatches(id)
  const next = games.find((m) => m.status === 'scheduled')
  const past = games.filter((m) => m.status !== 'scheduled')
  const squad = players.filter((p) => p.teamId === id)
  const league = leagueById(team.leagueId)

  return (
    <div className="page detail">
      <div className="team-hero">
        <Crest teamId={id} size={64} />
        <div className="team-hero-main">
          <h2>{team.name}</h2>
          <div className="team-hero-sub">{league.flag} {league.name}{team.position ? ` · ${team.position}-o'rin` : ''}</div>
        </div>
        <StarBtn active={nav.isFav(id)} onToggle={() => nav.toggleFav(id)} />
      </div>

      <div className="meta-card">
        {team.stadium && <div className="meta-row"><span>Stadion</span><b>{team.stadium}</b></div>}
        {team.stadiumCapacity && <div className="meta-row"><span>Sig'imi</span><b>{team.stadiumCapacity}</b></div>}
        {team.coach && <div className="meta-row"><span>Murabbiy</span><b>{team.coach}</b></div>}
        {!team.stadium && !team.coach && <div className="meta-row"><span>Liga</span><b>{league.name}</b></div>}
      </div>

      {next && (
        <>
          <h3 className="block-title">Keyingi o'yin</h3>
          <MatchRow match={next} onOpen={nav.openMatch} />
        </>
      )}
      {past.length > 0 && (
        <>
          <h3 className="block-title">Oxirgi o'yinlar</h3>
          {past.map((m) => <MatchRow key={m.id} match={m} onOpen={nav.openMatch} />)}
        </>
      )}
      {squad.length > 0 && (
        <>
          <h3 className="block-title">Tarkib</h3>
          {squad.map((p) => (
            <button key={p.id} className="player-row" onClick={() => nav.openPlayer(p.id)}>
              <span className="avatar">{p.initials}</span>
              <span className="player-row-main"><b>{p.name}</b><small>#{p.number} · {p.position}</small></span>
              <span className="row-chevron">›</span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}
