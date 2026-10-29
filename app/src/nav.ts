import { createContext, useContext } from 'react'
import type { TeamStub } from './data/types'

export type TabKey = 'live' | 'matches' | 'leagues' | 'favorites' | 'search'
export type DetailRoute = { name: 'match' | 'league' | 'team' | 'player'; id: string }

export interface Nav {
  openMatch: (id: string) => void
  openLeague: (id: string) => void
  openTeam: (id: string) => void
  /** player route id: "<gameId>:<playerHash>" */
  openPlayer: (id: string) => void
  back: () => void
  goTab: (tab: TabKey) => void
  favorites: Set<string>
  favTeam: (id: string) => TeamStub | undefined
  toggleFav: (team: TeamStub) => void
  isFav: (teamId: string) => boolean
}

export const NavContext = createContext<Nav | null>(null)

export function useNav(): Nav {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('NavContext topilmadi')
  return ctx
}
