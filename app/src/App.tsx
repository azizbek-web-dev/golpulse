import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavContext, type DetailRoute, type Nav, type TabKey } from './nav'
import type { TeamStub } from './data/types'
import { registerTeam } from './api'
import { tg, inTelegram } from './telegram'
import { IconActivity, IconBall, IconChevronLeft, IconSearch, IconStar, IconTrophy } from './icons'
import HomePage from './pages/HomePage'
import LeaguesPage from './pages/LeaguesPage'
import LeaguePage from './pages/LeaguePage'
import MatchPage from './pages/MatchPage'
import TeamPage from './pages/TeamPage'
import PlayerPage from './pages/PlayerPage'
import SearchPage from './pages/SearchPage'
import FavoritesPage from './pages/FavoritesPage'

const TABS: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  { key: 'live', label: 'Jonli', icon: <IconActivity size={21} /> },
  { key: 'matches', label: "O'yinlar", icon: <IconBall size={21} /> },
  { key: 'leagues', label: 'Ligalar', icon: <IconTrophy size={21} /> },
  { key: 'favorites', label: 'Sevimlilar', icon: <IconStar size={21} /> },
  { key: 'search', label: 'Qidiruv', icon: <IconSearch size={21} /> },
]

const FAV_KEY = 'golpulse-favs-v1'

function loadFavs(): Map<string, TeamStub> {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    if (!raw) return new Map()
    const arr = JSON.parse(raw) as TeamStub[]
    return new Map(arr.map((t) => [t.id, t]))
  } catch { return new Map() }
}

export default function App() {
  const [tab, setTab] = useState<TabKey>('live')
  const [stack, setStack] = useState<DetailRoute[]>([])
  const [favMap, setFavMap] = useState<Map<string, TeamStub>>(loadFavs)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify([...favMap.values()])) } catch { /* noop */ }
    favMap.forEach((t) => registerTeam(t))
  }, [favMap])

  const favorites = useMemo(() => new Set(favMap.keys()), [favMap])

  const push = useCallback((r: DetailRoute) => setStack((s) => [...s, r]), [])
  const back = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const goTab = useCallback((t: TabKey) => { setTab(t); setStack([]) }, [])

  const nav = useMemo<Nav>(() => ({
    openMatch: (id) => push({ name: 'match', id }),
    openLeague: (id) => push({ name: 'league', id }),
    openTeam: (id) => push({ name: 'team', id }),
    openPlayer: (id) => push({ name: 'player', id }),
    back,
    goTab,
    favorites,
    favTeam: (id) => favMap.get(id),
    toggleFav: (team) => setFavMap((prev) => {
      const next = new Map(prev)
      if (next.has(team.id)) next.delete(team.id); else next.set(team.id, team)
      return next
    }),
    isFav: (teamId) => favMap.has(teamId),
  }), [push, back, goTab, favorites, favMap])

  // Telegram native BackButton: faqat detail sahifalarda (REJA 3-bo'lim)
  const backRef = useRef(back)
  backRef.current = back
  useEffect(() => {
    const w = tg()
    if (!w) return
    const handler = () => backRef.current()
    if (stack.length > 0) { w.BackButton.show(); w.BackButton.onClick(handler) }
    else w.BackButton.hide()
    return () => { try { w.BackButton.offClick(handler) } catch { /* noop */ } }
  }, [stack.length])

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [tab, stack])

  const top = stack[stack.length - 1]

  return (
    <NavContext.Provider value={nav}>
      <div className="app">
        <header className="appbar">
          {top && !inTelegram() ? (
            <button className="icon-btn back" onClick={back} aria-label="Orqaga"><IconChevronLeft size={26} /></button>
          ) : (
            <span className="appbar-spacer" />
          )}
          <div className="logo">Gol<span>Pulse</span></div>
          <span className="live-badge"><span className="live-dot" /> LIVE</span>
        </header>

        <main className="content" ref={scrollRef}>
          {top?.name === 'match' && <MatchPage key={top.id} id={top.id} />}
          {top?.name === 'league' && <LeaguePage key={top.id} id={top.id} />}
          {top?.name === 'team' && <TeamPage key={top.id} id={top.id} />}
          {top?.name === 'player' && <PlayerPage key={top.id} id={top.id} />}
          {!top && tab === 'live' && <HomePage key="live" defaultFilter="live" />}
          {!top && tab === 'matches' && <HomePage key="all" defaultFilter="all" />}
          {!top && tab === 'leagues' && <LeaguesPage />}
          {!top && tab === 'favorites' && <FavoritesPage />}
          {!top && tab === 'search' && <SearchPage />}
        </main>

        <nav className="bottom-nav">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`bottom-nav-item${!top && tab === t.key ? ' active' : ''}`}
              onClick={() => goTab(t.key)}
            >
              <span className="bottom-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
              {t.key === 'favorites' && favorites.size > 0 && <span className="nav-badge">{favorites.size}</span>}
            </button>
          ))}
        </nav>
      </div>
    </NavContext.Provider>
  )
}
