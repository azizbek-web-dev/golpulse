import { useMemo, useState } from 'react'
import { fetchLive, registerLeague, registerTeam, useFetch } from '../api'
import type { ApiMatch } from '../data/types'
import { ErrorBox, LeagueHeader, MatchRow, Skeleton } from '../components'
import { IconCalendar } from '../icons'
import { useNav } from '../nav'

type Filter = 'all' | 'live' | 'finished' | 'scheduled'
const CHIPS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'Barchasi' },
  { key: 'live', label: 'Jonli' },
  { key: 'finished', label: 'Tugagan' },
  { key: 'scheduled', label: 'Rejalashtirilgan' },
]

const matchFilter = (f: Filter) => (m: ApiMatch) => {
  if (f === 'all') return true
  if (f === 'live') return m.status === 'live' || m.status === 'halftime'
  return m.status === f
}

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']

/** Bosh/Jonli ro'yxat — real fid, liga guruhlari, 5 soniyalik avto-yangilanish */
export default function HomePage({ defaultFilter }: { defaultFilter: Filter }) {
  const nav = useNav()
  const [filter, setFilter] = useState<Filter>(defaultFilter)
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const { data, error, loading, reload } = useFetch(fetchLive, [], 5000)

  if (data) {
    for (const g of data.leagues) {
      registerLeague(g)
      for (const m of g.games) { registerTeam(m.home); registerTeam(m.away) }
    }
  }

  const groups = useMemo(() => {
    if (!data) return []
    const f = matchFilter(filter)
    return data.leagues
      .map((l) => ({ league: l, games: l.games.filter(f) }))
      .filter((g) => g.games.length > 0)
      .sort((a, b) => Number(pinned.has(b.league.id)) - Number(pinned.has(a.league.id)))
  }, [data, filter, pinned])

  const toggleSet = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id); else next.add(id)
    apply(next)
  }

  const now = new Date()
  const dateLabel = `Bugun, ${now.getDate()}-${MONTHS[now.getMonth()]}`

  return (
    <div className="page">
      <div className="date-nav">
        <span className="date-nav-label"><IconCalendar size={15} /> {dateLabel}</span>
      </div>

      <div className="chips">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            className={`chip${filter === c.key ? ' active' : ''}`}
            onClick={() => setFilter(c.key)}
          >
            {c.label}
            {c.key === 'live' && data && data.counts.live > 0 && <span className="chip-badge">{data.counts.live}</span>}
          </button>
        ))}
      </div>

      {loading && <Skeleton rows={6} />}
      {error && !data && <ErrorBox onRetry={reload} />}

      {data && groups.length === 0 && <div className="empty-note">Bu filtr bo'yicha o'yinlar yo'q</div>}

      {groups.map(({ league, games }) => (
        <section className="league-group" key={league.id}>
          <LeagueHeader
            league={league}
            pinned={pinned.has(league.id)}
            collapsed={collapsed.has(league.id)}
            onPin={() => toggleSet(pinned, league.id, setPinned)}
            onToggle={() => toggleSet(collapsed, league.id, setCollapsed)}
            onOpenLeague={() => { if (!league.id.startsWith('res-')) nav.openLeague(league.id) }}
            onOpenTable={() => { if (!league.id.startsWith('res-')) nav.openLeague(league.id) }}
          />
          {!collapsed.has(league.id) && games.map((m) => (
            <MatchRow key={m.id} match={m} onOpen={nav.openMatch} />
          ))}
        </section>
      ))}
    </div>
  )
}
