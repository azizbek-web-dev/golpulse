// GolPulse — ma'lumot modellari (BFF adapter shakliga mos: betgo.site/gp-api).
// Fidda yo'q maydonlar ataylab yo'q: momentum vaqt qatori, bozor qiymati,
// shartnoma — adapter ularni bermaydi va UI ham chizmaydi.

export type MatchStatus = 'live' | 'halftime' | 'finished' | 'scheduled'

export interface TeamStub {
  id: string // provayder clId
  name: string
  short: string
  crestUrl?: string | null
}

export interface LeagueStub {
  id: string
  name: string
  country: string
  logoUrl?: string | null
  countryImageUrl?: string | null
  liveCount?: number
  gamesCount?: number
}

export interface PeriodScore {
  name: string
  home: number | null
  away: number | null
}

export interface StatLine {
  label: string
  home: number
  away: number
  decimals?: number
  suffix?: string
}

export interface ApiMatch {
  id: string
  leagueId: string
  leagueName: string
  home: TeamStub
  away: TeamStub
  status: MatchStatus
  minute?: number | null
  timeSec?: number // fid soati (soniya) — lokal daqiqa taymeri shundan yuradi
  timeRun?: boolean
  periodScores: PeriodScore[]
  homeScore?: number | null
  awayScore?: number | null
  htHome?: number | null
  htAway?: number | null
  startTs: number
  startTime: string
  dateLabel: string
  tablo?: StatLine[]
}

export interface LiveLeagueGroup extends LeagueStub {
  games: ApiMatch[]
}

export interface LiveData {
  leagues: LiveLeagueGroup[]
  counts: { live: number; finished: number; scheduled: number }
  updatedAt: number
  v?: string // adapter kontent hashi — o'zgarmagan javobda qayta render bo'lmaydi
}

/** Tanlangan kun (a=day) — shakli LiveData bilan bir xil, oraliq -14..+7 kun */
export interface DayData extends LiveData {
  date: string // YYYY-MM-DD (Asia/Tashkent)
  kind: 'today' | 'past' | 'future'
}

export type EventType = 'goal' | 'pen-goal' | 'yellow' | 'red' | 'sub' | 'pen-missed' | 'chance' | 'info'

export interface MatchEvent {
  minute: number
  minuteLabel: string
  type: EventType
  teamId: string
  player: string
  note: string
  period: string
}

export interface LineupPlayer {
  id: string
  name: string
  shortName: string
  number: number
  photo?: string | null
  country: string
  pos: string // GK, DF, MF, FW yoki ''
  x?: number
  y?: number
  rating?: number // fidda kelgan o'yinlardagina (odatda yo'q)
}

export interface SideLineup {
  formation: string | null
  hasPositions: boolean
  players: LineupPlayer[]
  subs: Array<{ name: string; number: number }>
  coach: string | null
  teamId: string
}

export interface TeamGameRow {
  date: string
  dateTs: number
  home: string
  away: string
  homeId: string
  awayId: string
  score: string | null
  result?: 'W' | 'D' | 'L'
}

export interface H2HData {
  homeWins: number
  draws: number
  awayWins: number
  total: number
  past: TeamGameRow[]
  homeRecent: TeamGameRow[]
  awayRecent: TeamGameRow[]
}

export interface StandingRow {
  pos: number
  team: TeamStub
  played: number
  won: number
  drawn: number
  lost: number
  goals: string
  points: number
  form: Array<'W' | 'D' | 'L'>
}

export interface TableData {
  v?: string
  title: string
  groups: Array<{ name: string; rows: StandingRow[] }>
}

export interface MatchBundle {
  v?: string
  match: ApiMatch
  meta: {
    venue: string | null
    stage: string | null
    referee: string | null
    weather: string | null
    temperature: string | null
    capacity: string | null
  }
  events: MatchEvent[] | null
  stats: { all: StatLine[] | null; h1: StatLine[] | null; h2: StatLine[] | null } | null
  lineups: { home: SideLineup; away: SideLineup } | null
  h2h: H2HData | null
  table: TableData | null
}

export interface LeaguePageData {
  v?: string
  league: LeagueStub
  games: ApiMatch[]
  lastGames: ApiMatch[] | null
  tableGameId: string | null
}

export interface SearchData {
  v?: string
  teams: Array<TeamStub & { leagueName: string }>
  leagues: LeagueStub[]
  matches: ApiMatch[]
}

export interface TeamPageData {
  v?: string
  team: TeamStub
  league: { id: string; name: string }
  coach: string | null
  stadium?: string | null
  nextMatch: ApiMatch | null
  recent: TeamGameRow[]
  squad: Array<{ id: string; name: string; shortName: string; photo?: string | null; country: string }>
  repGameId: string
}

export interface PlayerPageData {
  v?: string
  player: LineupPlayer & { teamId: string }
  team: TeamStub
  teamRecent: TeamGameRow[]
  gameId: string
}
