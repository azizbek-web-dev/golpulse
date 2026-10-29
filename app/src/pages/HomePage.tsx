import { useMemo, useState } from 'react'
import { leagues, matches } from '../data/mock'
import type { Match } from '../data/types'
import { LeagueHeader, MatchRow } from '../components'
import { IconCalendar, IconChevronLeft, IconChevronRight } from '../icons'
import { useNav } from '../nav'

type Filter = 'all' | 'live' | 'finished' | 'scheduled'
const CHIPS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'Barchasi' },
  { key: 'live', label: 'Jonli' },
  { key: 'finished', label: 'Tugagan' },
  { key: 'scheduled', label: 'Rejalashtirilgan' },
]

const matchFilter = (f: Filter) => (m: Match) => {
  if (f === 'all') return true
  if (f === 'live') return m.status === 'live' || m.status === 'halftime'
  return m.status === f
}

/** Bosh/Jonli ro'yxat — liga guruhlari, chiplar, sana navigatori */
export default function HomePage({ defaultFilter }: { defaultFilter: Filter }) {
  const nav = useNav()
  const [filter, setFilter] = useState<Filter>(defaultFilter)
  const [pinned, setPinned] = useState<Set<string>>(new Set(['epl']))
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const byLeague = leagues
      .map((l) => ({ league: l, games: matches.filter((m) => m.leagueId === l.id).filter(matchFilter(filter)) }))
      .filter((g) => g.games.length > 0)
    return byLeague.sort((a, b) => Number(pinned.has(b.league.id)) - Number(pinned.has(a.league.id)))
  }, [filter, pinned])

  const toggleSet = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id); else next.add(id)
    apply(next)
  }

  const liveCount = matches.filter((m) => m.status === 'live' || m.status === 'halftime').length

  return (
    <div className="page">
      <div className="date-nav">
        <button className="icon-btn"><IconChevronLeft size={18} /></button>
        <span className="date-nav-label"><IconCalendar size={15} /> Bugun, 29-oktabr</span>
        <button className="icon-btn"><IconChevronRight size={18} /></button>
      </div>

      <div className="chips">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            className={`chip${filter === c.key ? ' active' : ''}`}
            onClick={() => setFilter(c.key)}
          >
            {c.label}
            {c.key === 'live' && liveCount > 0 && <span className="chip-badge">{liveCount}</span>}
          </button>
        ))}
      </div>

      {groups.length === 0 && <div className="empty-note">Bu filtr bo'yicha o'yinlar yo'q</div>}

      {groups.map(({ league, games }) => (
        <section className="league-group" key={league.id}>
          <LeagueHeader
            leagueId={league.id}
            pinned={pinned.has(league.id)}
            collapsed={collapsed.has(league.id)}
            onPin={() => toggleSet(pinned, league.id, setPinned)}
            onToggle={() => toggleSet(collapsed, league.id, setCollapsed)}
            onOpenLeague={() => nav.openLeague(league.id)}
            onOpenTable={() => nav.openLeague(league.id)}
          />
          {!collapsed.has(league.id) && games.map((m) => (
            <MatchRow key={m.id} match={m} onOpen={nav.openMatch} />
          ))}
        </section>
      ))}
    </div>
  )
}
