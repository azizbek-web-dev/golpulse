import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  LeaguePageData, LeagueStub, LiveData, MatchBundle, PlayerPageData,
  SearchData, TableData, TeamPageData, TeamStub,
} from './data/types'

// BFF adapter (Beget, betgo.site ostida) — CORS faqat shu origin uchun ochiq
export const API_BASE = 'https://betgo.site/gp-api/'

async function apiGet<T>(query: string): Promise<T> {
  const res = await fetch(`${API_BASE}?${query}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!json.success) throw new Error('Adapter xatosi')
  return json.data as T
}

export const fetchLive = () => apiGet<LiveData>('a=live')
export const fetchMatch = (id: string) => apiGet<MatchBundle>(`a=match&id=${encodeURIComponent(id)}`)
export const fetchTable = (gameId: string) => apiGet<TableData | null>(`a=table&game_id=${encodeURIComponent(gameId)}`)
export const fetchLeague = (champ: string) => apiGet<LeaguePageData>(`a=league&champ=${encodeURIComponent(champ)}`)
export const fetchLeagues = () => apiGet<{ leagues: LeagueStub[] }>('a=leagues')
export const fetchSearch = (q: string) => apiGet<SearchData>(`a=search&q=${encodeURIComponent(q)}`)
export const fetchTeam = (clId: string) => apiGet<TeamPageData>(`a=team&clId=${encodeURIComponent(clId)}`)
export const fetchPlayer = (gameId: string, player: string) =>
  apiGet<PlayerPageData>(`a=player&game_id=${encodeURIComponent(gameId)}&player=${encodeURIComponent(player)}`)

// ---- Jonli registr: kelgan ma'lumotdan jamoa/liga vizualini eslab qolish ----
export interface TeamVisual {
  name: string
  short: string
  crestUrl?: string | null
  color: string
}

const teamRegistry = new Map<string, TeamVisual>()
const leagueRegistry = new Map<string, LeagueStub>()

const normName = (s: string) => s.toLowerCase().replace(/[''`’ʼ]/g, '').trim()

// O'zimizning sifatli gerblar (public/crests/) — fid nomi (UZ/EN) bo'yicha moslash
const LOCAL_CRESTS: Array<{ names: string[]; crest: string; color: string }> = [
  { names: ['arsenal'], crest: 'crests/ars.png', color: '#EF0107' },
  { names: ['liverpool', 'liverpul'], crest: 'crests/liv.png', color: '#C8102E' },
  { names: ['chelsea', 'chelsi'], crest: 'crests/che.png', color: '#034694' },
  { names: ['manchester city', 'manchester siti', 'man city'], crest: 'crests/mci.png', color: '#6CABDD' },
  { names: ['manchester united', 'manchester yunayted', 'man utd'], crest: 'crests/mun.png', color: '#DA291C' },
  { names: ['bournemouth', 'bornmut'], crest: 'crests/bou.png', color: '#B50E12' },
  { names: ['aston villa'], crest: 'crests/avl.png', color: '#670E36' },
  { names: ['brighton', 'brayton'], crest: 'crests/bha.png', color: '#0057B8' },
  { names: ['leeds', 'lids'], crest: 'crests/lee.png', color: '#8a7d1a' },
  { names: ['real madrid'], crest: 'crests/rma.png', color: '#7a6a1f' },
  { names: ['barcelona', 'barselona'], crest: 'crests/bar.png', color: '#A50044' },
  { names: ['atletico madrid', 'atletiko madrid', 'atlético madrid'], crest: 'crests/atm.png', color: '#CB3524' },
  { names: ['inter', 'internazionale'], crest: 'crests/int.png', color: '#0068A8' },
  { names: ['napoli'], crest: 'crests/nap.png', color: '#12A0D7' },
  { names: ['juventus', 'yuventus'], crest: 'crests/juv.png', color: '#4d4d4d' },
  { names: ['bayern', 'bavariya'], crest: 'crests/bay.png', color: '#DC052D' },
  { names: ['dortmund', 'borussiya dortmund', 'borussia dortmund'], crest: 'crests/bvb.png', color: '#9c8a00' },
  { names: ['paxtakor'], crest: 'crests/pak.png', color: '#1d4ed8' },
  { names: ['nasaf'], crest: 'crests/nas.png', color: '#0369a1' },
  { names: ['bunyodkor'], crest: 'crests/bun.png', color: '#15803d' },
]

export function localCrestFor(name: string): { crest: string; color: string } | undefined {
  const n = normName(name)
  return LOCAL_CRESTS.find((c) => c.names.some((x) => n === x || n.startsWith(x + ' ')))
}

const FALLBACK_COLORS = ['#3E5C50', '#5C4A3E', '#46586E', '#5E466E', '#6E4646', '#3E5C6E', '#556B2F', '#71563A']
export function colorFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length]
}

export function registerTeam(t: TeamStub): void {
  if (!t || !t.id) return
  const prev = teamRegistry.get(t.id)
  teamRegistry.set(t.id, {
    name: t.name,
    short: t.short || prev?.short || t.name.slice(0, 3).toUpperCase(),
    crestUrl: t.crestUrl ?? prev?.crestUrl ?? null,
    color: prev?.color ?? colorFor(t.id),
  })
}

export function registerLeague(l: LeagueStub): void {
  if (!l || !l.id) return
  const prev = leagueRegistry.get(l.id)
  leagueRegistry.set(l.id, { ...prev, ...l, logoUrl: l.logoUrl ?? prev?.logoUrl ?? null })
}

export function teamInfo(id: string): TeamVisual {
  const r = teamRegistry.get(id)
  if (r) return r
  return { name: id, short: id.slice(0, 3).toUpperCase(), color: colorFor(id) }
}

export function leagueInfo(id: string): LeagueStub | undefined {
  return leagueRegistry.get(id)
}

// O'z liga logotiplarimiz (public/leagues/) — fid nomi bo'yicha
export function localLeagueLogo(l: LeagueStub): string | undefined {
  const n = normName(l.name)
  const c = normName(l.country ?? '')
  if (n.includes('premyer') && c.includes('angliya')) return 'leagues/epl.png'
  if (n.includes('la liga') || n.includes('laliga')) return 'leagues/laliga.png'
  if (n.includes('seriyasi') && c.includes('italiya')) return 'leagues/seriea.png'
  if (n.includes('bundesliga')) return 'leagues/bundesliga.png'
  if (n.includes('superliga') && c.includes("o'zbekiston")) return 'leagues/superliga.png'
  return undefined
}

// ---- Yuklanish hook'i: skeleton + xato/qayta urinish + polling ----
export interface FetchState<T> {
  data: T | null
  error: boolean
  loading: boolean
  reload: () => void
}

export function useFetch<T>(fn: () => Promise<T>, deps: unknown[], pollMs?: number): FetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const aliveRef = useRef(true)

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    aliveRef.current = true
    let timer: number | undefined
    const run = async (first: boolean) => {
      if (first) setLoading(true)
      try {
        const d = await fnRef.current()
        if (!aliveRef.current) return
        setData(d)
        setError(false)
      } catch {
        if (!aliveRef.current) return
        if (first) setError(true)
      } finally {
        if (aliveRef.current && first) setLoading(false)
      }
      if (pollMs && aliveRef.current) timer = window.setTimeout(() => run(false), pollMs)
    }
    run(true)
    return () => { aliveRef.current = false; if (timer) window.clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, pollMs])

  return { data, error, loading, reload }
}
