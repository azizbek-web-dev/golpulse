// GolPulse — ichki ma'lumot modellari.
// Shakl BetGO/provayder fidiga yaqin tutildi: real API ulanganda faqat
// src/data/ qatlamidagi adapter o'zgaradi, komponentlar tegilmaydi.

export type MatchStatus = 'live' | 'halftime' | 'finished' | 'scheduled'

export interface League {
  id: string
  name: string
  country: string
  flag: string
  /** real liga logotipi (public/leagues/), bo'lmasa flag emoji ishlatiladi */
  logo?: string
  season: string
  /** mavsum progressi, 0..1 */
  progress: number
  followers?: string
}

export interface Team {
  id: string
  name: string
  short: string // 3 harfli qisqartma — gerb topilmasa fallback
  color: string // fallback doira rangi
  /** real jamoa gerbi (public/crests/), bo'lmasa harfli doiracha chiqadi */
  crest?: string
  leagueId: string
  stadium?: string
  stadiumCapacity?: string
  coach?: string
  position?: number // ligadagi o'rni
}

export type EventType = 'goal' | 'yellow' | 'red' | 'sub' | 'pen-goal' | 'chance'

export interface MatchEvent {
  minute: number
  type: EventType
  teamId: string
  player: string
  note?: string // assist, sabab, almashtirish jufti
}

export interface StatLine {
  label: string
  home: number
  away: number
  decimals?: number // xG uchun 2
  suffix?: string // '%' egalik uchun
}

export interface LineupPlayer {
  name: string
  number: number
  pos: string // GK, DF, MF, FW
  rating?: number
  goals?: number
  yellow?: boolean
}

export interface Match {
  id: string
  leagueId: string
  homeId: string
  awayId: string
  status: MatchStatus
  minute?: number // jonli bo'lsa
  homeScore?: number
  awayScore?: number
  htHome?: number // 1-bo'lim hisobi
  htAway?: number
  startTime: string // 'HH:MM' yoki sana+vaqt
  dateLabel: string
  events?: MatchEvent[]
  stats?: StatLine[]
  homeFormation?: string
  awayFormation?: string
  homeLineup?: LineupPlayer[]
  awayLineup?: LineupPlayer[]
  homeSubs?: string[]
  awaySubs?: string[]
  homeRating?: number
  awayRating?: number
  momentum?: number[] // -100 (mehmon bosimi) .. +100 (uy bosimi), segmentlar
  venue?: string
  referee?: string
}

export interface StandingRow {
  pos: number
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  goals: string // '20:9'
  points: number
  form: Array<'W' | 'D' | 'L'>
}

export interface Player {
  id: string
  name: string
  teamId: string
  position: string
  number: number
  age: number
  birthDate: string
  marketValue: string
  contractUntil?: string
  initials: string
}

export interface PlayerMatchLine {
  date: string
  opponent: string
  score: string
  result: 'W' | 'D' | 'L'
  minutes: number
  goals: number
  rating: number
  note?: string
}
