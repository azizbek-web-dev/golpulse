import { fetchLeagues, registerLeague, useFetch } from '../api'
import { ErrorBox, LeagueLogo, LeaguesSkeleton } from '../components'
import { IconChevronRight } from '../icons'
import { useNav } from '../nav'

export default function LeaguesPage() {
  const nav = useNav()
  const { data, error, loading, reload } = useFetch(fetchLeagues, [], 60000)
  if (data) for (const l of data.leagues) registerLeague(l)

  const live = data?.leagues.filter((l) => (l.liveCount ?? 0) > 0) ?? []
  const rest = data?.leagues.filter((l) => (l.liveCount ?? 0) === 0) ?? []

  const row = (l: (typeof live)[number]) => (
    <button key={l.id} className="league-row" onClick={() => nav.openLeague(l.id)}>
      <LeagueLogo leagueId={l.id} league={l} size={34} />
      <span className="league-row-main">
        <b>{l.name}</b>
        <small>
          {l.country}
          {(l.liveCount ?? 0) > 0 ? ` · ${l.liveCount} jonli` : ''}
          {` · ${l.gamesCount ?? 0} o'yin`}
        </small>
      </span>
      {(l.liveCount ?? 0) > 0 && <span className="live-dot" />}
      <IconChevronRight size={19} className="row-chevron" />
    </button>
  )

  return (
    <div className="page">
      <h2 className="page-title">Ligalar</h2>
      {loading && <LeaguesSkeleton />}
      {error && !data && <ErrorBox onRetry={reload} />}
      {data && live.length > 0 && (
        <>
          <div className="section-label">Hozir jonli</div>
          {live.map(row)}
        </>
      )}
      {data && (
        <>
          <div className="section-label">Barcha ligalar</div>
          {rest.map(row)}
          {live.length === 0 && rest.length === 0 && <div className="empty-note">Ligalar topilmadi</div>}
        </>
      )}
    </div>
  )
}
