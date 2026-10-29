import { createContext, useContext } from 'react'

export type TabKey = 'live' | 'matches' | 'leagues' | 'favorites' | 'search'
export type DetailRoute = { name: 'match' | 'league' | 'team' | 'player'; id: string }

export interface Nav {
  openMatch: (id: string) => void
  openLeague: (id: string) => void
  openTeam: (id: string) => void
  openPlayer: (id: string) => void
  back: () => void
  goTab: (tab: TabKey) => void
  favorites: Set<string>
  toggleFav: (teamId: string) => void
  isFav: (teamId: string) => boolean
}

export const NavContext = createContext<Nav | null>(null)

export function useNav(): Nav {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('NavContext topilmadi')
  return ctx
}
