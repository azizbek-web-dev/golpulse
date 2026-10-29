import type {
  League, Team, Match, StandingRow, Player, PlayerMatchLine,
} from './types'

// ---- Ligalar ------------------------------------------------------------
export const leagues: League[] = [
  { id: 'epl', name: 'Premier League', country: 'Angliya', flag: '🇬🇧', season: '2026/2027', progress: 0.25, followers: '1.2M' },
  { id: 'laliga', name: 'La Liga', country: 'Ispaniya', flag: '🇪🇸', season: '2026/2027', progress: 0.24 },
  { id: 'seriea', name: 'Serie A', country: 'Italiya', flag: '🇮🇹', season: '2026/2027', progress: 0.23 },
  { id: 'bundesliga', name: 'Bundesliga', country: 'Germaniya', flag: '🇩🇪', season: '2026/2027', progress: 0.22 },
  { id: 'superliga', name: 'Superliga', country: "O'zbekiston", flag: '🇺🇿', season: '2026', progress: 0.78 },
]

export const leagueById = (id: string): League => leagues.find((l) => l.id === id)!

// ---- Jamoalar ------------------------------------------------------------
export const teams: Team[] = [
  { id: 'bou', name: 'Bournemouth', short: 'BOU', color: '#B50E12', leagueId: 'epl', stadium: 'Vitality Stadium', stadiumCapacity: '11 307', coach: 'Marco Rose', position: 10 },
  { id: 'avl', name: 'Aston Villa', short: 'AVL', color: '#670E36', leagueId: 'epl', stadium: 'Villa Park', coach: 'Unai Emery', position: 8 },
  { id: 'mci', name: 'Man City', short: 'MCI', color: '#6CABDD', leagueId: 'epl' },
  { id: 'ars', name: 'Arsenal', short: 'ARS', color: '#EF0107', leagueId: 'epl' },
  { id: 'liv', name: 'Liverpool', short: 'LIV', color: '#C8102E', leagueId: 'epl' },
  { id: 'che', name: 'Chelsea', short: 'CHE', color: '#034694', leagueId: 'epl' },
  { id: 'mun', name: 'Man Utd', short: 'MUN', color: '#DA291C', leagueId: 'epl' },
  { id: 'lee', name: 'Leeds United', short: 'LEE', color: '#8a7d1a', leagueId: 'epl' },
  { id: 'rma', name: 'Real Madrid', short: 'RMA', color: '#7a6a1f', leagueId: 'laliga' },
  { id: 'bar', name: 'Barcelona', short: 'BAR', color: '#A50044', leagueId: 'laliga' },
  { id: 'atm', name: 'Atlético Madrid', short: 'ATM', color: '#CB3524', leagueId: 'laliga' },
  { id: 'int', name: 'Inter', short: 'INT', color: '#0068A8', leagueId: 'seriea' },
  { id: 'nap', name: 'Napoli', short: 'NAP', color: '#12A0D7', leagueId: 'seriea' },
  { id: 'juv', name: 'Juventus', short: 'JUV', color: '#4d4d4d', leagueId: 'seriea' },
  { id: 'bay', name: 'Bayern', short: 'BAY', color: '#DC052D', leagueId: 'bundesliga' },
  { id: 'bvb', name: 'Dortmund', short: 'BVB', color: '#9c8a00', leagueId: 'bundesliga' },
  { id: 'pak', name: 'Paxtakor', short: 'PAK', color: '#1d4ed8', leagueId: 'superliga' },
  { id: 'nas', name: 'Nasaf', short: 'NAS', color: '#0369a1', leagueId: 'superliga' },
  { id: 'bun', name: 'Bunyodkor', short: 'BUN', color: '#15803d', leagueId: 'superliga' },
]

export const teamById = (id: string): Team => teams.find((t) => t.id === id)!

// ---- O'yinlar ------------------------------------------------------------
export const matches: Match[] = [
  // Premier League
  {
    id: 'm-bou-avl', leagueId: 'epl', homeId: 'bou', awayId: 'avl',
    status: 'finished', homeScore: 3, awayScore: 0, htHome: 1, htAway: 0,
    startTime: '00:45', dateLabel: '29.10.2026', venue: 'Vitality Stadium', referee: 'M. Oliver',
    homeFormation: '4-1-4-1', awayFormation: '4-2-3-1', homeRating: 8.68, awayRating: 6.67,
    events: [
      { minute: 7, type: 'goal', teamId: 'bou', player: 'Amine Adli', note: 'L. Cook assist' },
      { minute: 23, type: 'yellow', teamId: 'avl', player: 'Tyrone Mings', note: 'Qo\'pol o\'yin' },
      { minute: 34, type: 'yellow', teamId: 'bou', player: 'Lewis Cook', note: 'Taktik fol' },
      { minute: 51, type: 'goal', teamId: 'bou', player: 'Lewis Cook', note: 'Uzoq masofadan zarba' },
      { minute: 63, type: 'sub', teamId: 'avl', player: 'Joao Gomes', note: 'J. McGinn o\'rniga' },
      { minute: 69, type: 'goal', teamId: 'bou', player: 'Álvaro Rodriguez', note: 'Bosh bilan' },
      { minute: 78, type: 'sub', teamId: 'bou', player: 'Ben Gannon-Doak', note: 'A. Adli o\'rniga' },
      { minute: 84, type: 'yellow', teamId: 'avl', player: 'Joao Gomes', note: 'Etiroz' },
    ],
    stats: [
      { label: 'To\'pga egalik', home: 49, away: 51, suffix: '%' },
      { label: 'Kutilgan gollar (xG)', home: 2.58, away: 3.24, decimals: 2 },
      { label: 'Jami zarbalar', home: 19, away: 17 },
      { label: 'Aniq zarbalar', home: 7, away: 5 },
      { label: 'Katta vaziyatlar', home: 4, away: 3 },
      { label: 'Burchak to\'plari', home: 6, away: 2 },
      { label: 'Follar', home: 13, away: 15 },
      { label: 'Ofsaydlar', home: 2, away: 1 },
      { label: 'Seyvlar', home: 5, away: 4 },
    ],
    momentum: [12, 28, 45, 62, 38, 20, 8, -14, -30, -22, -40, -55, -35, -18, 5, 25, 48, 70, 55, 30, 15, -8, -20, -12, 10, 33, 58, 44, 22, 6],
    homeLineup: [
      { name: 'Djordje Petrovic', number: 1, pos: 'GK', rating: 7.8 },
      { name: 'Adam Smith', number: 15, pos: 'DF', rating: 7.4 },
      { name: 'Marcos Senesi', number: 5, pos: 'DF', rating: 7.9 },
      { name: 'Bafodé Diakité', number: 18, pos: 'DF', rating: 7.6 },
      { name: 'Adrien Truffert', number: 3, pos: 'DF', rating: 7.5 },
      { name: 'Lewis Cook', number: 4, pos: 'MF', rating: 8.0, goals: 1, yellow: true },
      { name: 'Amine Adli', number: 21, pos: 'MF', rating: 8.4, goals: 1 },
      { name: 'Tyler Adams', number: 12, pos: 'MF', rating: 7.7 },
      { name: 'Marcus Tavernier', number: 16, pos: 'MF', rating: 8.1 },
      { name: 'David Brooks', number: 7, pos: 'MF', rating: 7.8 },
      { name: 'Álvaro Rodriguez', number: 9, pos: 'FW', rating: 7.9, goals: 1 },
    ],
    awayLineup: [
      { name: 'Marco Bizot', number: 40, pos: 'GK', rating: 6.1 },
      { name: 'Matty Cash', number: 2, pos: 'DF', rating: 6.4 },
      { name: 'Tyrone Mings', number: 5, pos: 'DF', rating: 6.2, yellow: true },
      { name: 'Ezri Konsa', number: 4, pos: 'DF', rating: 6.5 },
      { name: 'Lucas Digne', number: 12, pos: 'DF', rating: 6.6 },
      { name: 'Boubacar Kamara', number: 44, pos: 'MF', rating: 6.7 },
      { name: 'Youri Tielemans', number: 8, pos: 'MF', rating: 6.9 },
      { name: 'John McGinn', number: 7, pos: 'MF', rating: 6.5 },
      { name: 'Morgan Rogers', number: 27, pos: 'MF', rating: 6.8 },
      { name: 'Emiliano Buendía', number: 10, pos: 'MF', rating: 6.4 },
      { name: 'Ollie Watkins', number: 11, pos: 'FW', rating: 6.3 },
    ],
    homeSubs: ['Ben Gannon-Doak', 'Enes Ünal', 'Ryan Christie', 'Alex Scott'],
    awaySubs: ['Joao Gomes', 'Ross Barkley', 'Donyell Malen', 'Ian Maatsen'],
  },
  {
    id: 'm-mci-ars', leagueId: 'epl', homeId: 'mci', awayId: 'ars',
    status: 'live', minute: 67, homeScore: 2, awayScore: 1, htHome: 1, htAway: 1,
    startTime: '21:30', dateLabel: 'Bugun',
    events: [
      { minute: 19, type: 'goal', teamId: 'mci', player: 'Erling Haaland', note: 'K. De Bruyne assist' },
      { minute: 41, type: 'goal', teamId: 'ars', player: 'Bukayo Saka', note: 'Penaltidan', },
      { minute: 58, type: 'goal', teamId: 'mci', player: 'Phil Foden' },
    ],
  },
  {
    id: 'm-che-mun', leagueId: 'epl', homeId: 'che', awayId: 'mun',
    status: 'scheduled', startTime: '22:00', dateLabel: '31.10.2026',
  },
  {
    id: 'm-lee-bou', leagueId: 'epl', homeId: 'lee', awayId: 'bou',
    status: 'scheduled', startTime: '19:30', dateLabel: '31.10.2026',
  },
  // La Liga
  {
    id: 'm-rma-atm', leagueId: 'laliga', homeId: 'rma', awayId: 'atm',
    status: 'live', minute: 34, homeScore: 1, awayScore: 0, htHome: 1, htAway: 0,
    startTime: '23:00', dateLabel: 'Bugun',
    events: [{ minute: 34, type: 'goal', teamId: 'rma', player: 'Kylian Mbappé' }],
  },
  {
    id: 'm-bar-rma', leagueId: 'laliga', homeId: 'bar', awayId: 'rma',
    status: 'finished', homeScore: 1, awayScore: 2, htHome: 1, htAway: 0,
    startTime: '22:00', dateLabel: '25.10.2026',
  },
  // Serie A
  {
    id: 'm-int-nap', leagueId: 'seriea', homeId: 'int', awayId: 'nap',
    status: 'halftime', homeScore: 0, awayScore: 0, htHome: 0, htAway: 0,
    startTime: '23:45', dateLabel: 'Bugun',
  },
  {
    id: 'm-juv-int', leagueId: 'seriea', homeId: 'juv', awayId: 'int',
    status: 'finished', homeScore: 1, awayScore: 1, htHome: 0, htAway: 1,
    startTime: '21:45', dateLabel: '27.10.2026',
  },
  // Bundesliga
  {
    id: 'm-bay-bvb', leagueId: 'bundesliga', homeId: 'bay', awayId: 'bvb',
    status: 'live', minute: 78, homeScore: 3, awayScore: 1, htHome: 2, htAway: 0,
    startTime: '20:30', dateLabel: 'Bugun',
  },
  {
    id: 'm-bvb-bay', leagueId: 'bundesliga', homeId: 'bvb', awayId: 'bay',
    status: 'scheduled', startTime: '21:30', dateLabel: '01.11.2026',
  },
  // Superliga
  {
    id: 'm-pak-nas', leagueId: 'superliga', homeId: 'pak', awayId: 'nas',
    status: 'live', minute: 52, homeScore: 1, awayScore: 1, htHome: 1, htAway: 0,
    startTime: '18:00', dateLabel: 'Bugun',
  },
  {
    id: 'm-bun-pak', leagueId: 'superliga', homeId: 'bun', awayId: 'pak',
    status: 'finished', homeScore: 0, awayScore: 2, htHome: 0, htAway: 1,
    startTime: '17:00', dateLabel: '26.10.2026',
  },
]

export const matchById = (id: string): Match => matches.find((m) => m.id === id)!
export const matchesByLeague = (leagueId: string): Match[] => matches.filter((m) => m.leagueId === leagueId)
export const teamMatches = (teamId: string): Match[] =>
  matches.filter((m) => m.homeId === teamId || m.awayId === teamId)

// ---- Premier League jadvali (namuna) -------------------------------------
export const eplStandings: StandingRow[] = [
  { pos: 1, teamId: 'mci', played: 9, won: 6, drawn: 3, lost: 0, goals: '20:7', points: 21, form: ['W', 'W', 'D', 'W', 'W'] },
  { pos: 2, teamId: 'ars', played: 9, won: 6, drawn: 3, lost: 0, goals: '17:5', points: 21, form: ['W', 'D', 'W', 'W', 'D'] },
  { pos: 3, teamId: 'liv', played: 9, won: 4, drawn: 3, lost: 2, goals: '15:11', points: 15, form: ['D', 'W', 'L', 'W', 'D'] },
  { pos: 4, teamId: 'che', played: 9, won: 4, drawn: 2, lost: 3, goals: '14:12', points: 14, form: ['W', 'L', 'W', 'D', 'L'] },
  { pos: 5, teamId: 'mun', played: 9, won: 4, drawn: 1, lost: 4, goals: '12:13', points: 13, form: ['L', 'W', 'W', 'L', 'D'] },
  { pos: 6, teamId: 'avl', played: 10, won: 3, drawn: 3, lost: 4, goals: '10:13', points: 12, form: ['L', 'D', 'W', 'L', 'L'] },
  { pos: 7, teamId: 'bou', played: 10, won: 3, drawn: 2, lost: 5, goals: '12:14', points: 11, form: ['W', 'L', 'D', 'L', 'W'] },
  { pos: 8, teamId: 'lee', played: 9, won: 2, drawn: 3, lost: 4, goals: '9:14', points: 9, form: ['D', 'L', 'D', 'W', 'L'] },
]

// Standings uchun qo'shimcha jamoa nomlari (ro'yxatda yo'q jamoalar)
export const brightonRow: StandingRow = { pos: 3, teamId: 'bha', played: 9, won: 5, drawn: 1, lost: 3, goals: '16:12', points: 16, form: ['W', 'W', 'L', 'W', 'D'] }

// Jadval sahifasida to'liq ko'rinish: tadqiqotdagi tartib (City 21, Arsenal 21, Brighton 16, Liverpool 15)
export const standingsFull: StandingRow[] = [
  eplStandings[0],
  eplStandings[1],
  brightonRow,
  { ...eplStandings[2], pos: 4 },
  { ...eplStandings[3], pos: 5 },
  { ...eplStandings[4], pos: 6 },
  { ...eplStandings[5], pos: 7 },
  { ...eplStandings[6], pos: 8 },
  { ...eplStandings[7], pos: 9 },
]

// Brighton jamoasi (standings uchun)
export const extraTeams: Record<string, { name: string; short: string; color: string }> = {
  bha: { name: 'Brighton', short: 'BHA', color: '#0057B8' },
}

// ---- O'yinchilar ----------------------------------------------------------
export const players: Player[] = [
  { id: 'p-cook', name: 'Lewis Cook', teamId: 'bou', position: 'Yarim himoyachi', number: 4, age: 29, birthDate: '3 February 1997', marketValue: '€11.6M', contractUntil: '30 Jun 2028', initials: 'LC' },
  { id: 'p-adli', name: 'Amine Adli', teamId: 'bou', position: 'Hujumkor yarim himoyachi', number: 21, age: 26, birthDate: '10 May 2000', marketValue: '€18M', initials: 'AA' },
  { id: 'p-saka', name: 'Bukayo Saka', teamId: 'ars', position: 'Qanot hujumchisi', number: 7, age: 25, birthDate: '5 September 2001', marketValue: '€140M', initials: 'BS' },
  { id: 'p-haaland', name: 'Erling Haaland', teamId: 'mci', position: 'Hujumchi', number: 9, age: 26, birthDate: '21 July 2000', marketValue: '€200M', initials: 'EH' },
]

export const playerById = (id: string): Player => players.find((p) => p.id === id)!

export const cookMatches: PlayerMatchLine[] = [
  { date: '29.10', opponent: 'Aston Villa', score: '3:0', result: 'W', minutes: 90, goals: 1, rating: 8.0, note: '1 gol, 1 sariq' },
  { date: '25.10', opponent: 'Leeds United', score: '1:1', result: 'D', minutes: 90, goals: 0, rating: 7.1 },
  { date: '21.10', opponent: 'Arsenal', score: '0:2', result: 'L', minutes: 84, goals: 0, rating: 6.4 },
  { date: '17.10', opponent: 'Chelsea', score: '2:1', result: 'W', minutes: 90, goals: 0, rating: 7.6, note: '1 assist' },
  { date: '04.10', opponent: 'Man City', score: '1:3', result: 'L', minutes: 90, goals: 0, rating: 6.8 },
]

// ---- H2H (Bournemouth — Aston Villa) --------------------------------------
export const h2hSummary = { homeWins: 3, draws: 3, awayWins: 4, total: 16 }
export const h2hPast = [
  { date: '10.05.2026', home: 'Aston Villa', away: 'Bournemouth', score: '1:0' },
  { date: '09.11.2025', home: 'Bournemouth', away: 'Aston Villa', score: '4:0' },
  { date: '18.05.2025', home: 'Aston Villa', away: 'Bournemouth', score: '2:2' },
  { date: '26.10.2024', home: 'Bournemouth', away: 'Aston Villa', score: '1:1' },
  { date: '21.04.2024', home: 'Aston Villa', away: 'Bournemouth', score: '3:1' },
]
