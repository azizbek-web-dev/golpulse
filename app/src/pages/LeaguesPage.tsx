import { leagues, matchesByLeague } from '../data/mock'
import { LeagueLogo } from '../components'
import { IconChevronRight } from '../icons'
import { useNav } from '../nav'

export default function LeaguesPage() {
  const nav = useNav()
  return (
    <div className="page">
      <h2 className="page-title">Ligalar</h2>
      <div className="section-label">Mashhur ligalar</div>
      {leagues.map((l) => (
        <button key={l.id} className="league-row" onClick={() => nav.openLeague(l.id)}>
          <LeagueLogo leagueId={l.id} size={34} />
          <span className="league-row-main">
            <b>{l.name}</b>
            <small>{l.country} · {matchesByLeague(l.id).length} o'yin bugun</small>
          </span>
          <IconChevronRight size={19} className="row-chevron" />
        </button>
      ))}
    </div>
  )
}
