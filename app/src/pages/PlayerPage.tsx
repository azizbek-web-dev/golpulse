import { playerById, teamById, cookMatches } from '../data/mock'
import { Crest, RatingPill } from '../components'
import { useNav } from '../nav'

const RESULT_LABEL = { W: 'G\'alaba', D: 'Durang', L: 'Mag\'lubiyat' } as const

export default function PlayerPage({ id }: { id: string }) {
  const nav = useNav()
  const player = playerById(id)
  const team = teamById(player.teamId)
  const isCook = id === 'p-cook'

  return (
    <div className="page detail">
      <div className="player-hero">
        <span className="avatar big">{player.initials}</span>
        <div>
          <h2>{player.name}</h2>
          <button className="player-team-link" onClick={() => nav.openTeam(team.id)}>
            <Crest teamId={team.id} size={18} /> {team.name}
          </button>
        </div>
        {isCook && <span className="player-last-rating"><RatingPill value={8.0} big /></span>}
      </div>

      <div className="meta-card">
        <div className="meta-row"><span>Pozitsiya</span><b>{player.position} (#{player.number})</b></div>
        <div className="meta-row"><span>Yosh</span><b>{player.age} ({player.birthDate})</b></div>
        <div className="meta-row"><span>Bozor qiymati</span><b>{player.marketValue}</b></div>
        {player.contractUntil && <div className="meta-row"><span>Shartnoma</span><b>{player.contractUntil} gacha</b></div>}
      </div>

      <h3 className="block-title">Oxirgi o'yinlar</h3>
      {isCook ? (
        cookMatches.map((g, i) => (
          <div className="player-match-row" key={i}>
            <span className={`result-badge ${g.result}`}>{g.result}</span>
            <span className="player-match-main">
              <b>{g.opponent} — {g.score}</b>
              <small>{g.date} · {g.minutes}' · {RESULT_LABEL[g.result]}{g.note ? ` · ${g.note}` : ''}</small>
            </span>
            <RatingPill value={g.rating} />
          </div>
        ))
      ) : (
        <div className="empty-note">Namuna UI: o'yinlar tarixi Lewis Cook sahifasida to'liq ko'rsatilgan</div>
      )}
    </div>
  )
}
