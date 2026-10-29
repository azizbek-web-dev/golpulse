import { leagues, matchesByLeague } from '../data/mock'
import { useNav } from '../nav'

export default function LeaguesPage() {
  const nav = useNav()
  return (
    <div className="page">
      <h2 className="page-title">Ligalar</h2>
      <div className="section-label">Mashhur ligalar</div>
      {leagues.map((l) => (
        <button key={l.id} className="league-row" onClick={() => nav.openLeague(l.id)}>
          <span className="league-flag big">{l.flag}</span>
          <span className="league-row-main">
            <b>{l.name}</b>
            <small>{l.country} · {matchesByLeague(l.id).length} o'yin bugun</small>
          </span>
          <span className="row-chevron">›</span>
        </button>
      ))}
    </div>
  )
}
