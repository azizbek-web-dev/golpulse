import { fetchPlayer, registerTeam, useFetch } from '../api'
import { Crest, ErrorBox, PlayerSkeleton, RatingPill } from '../components'
import { useNav } from '../nav'
import { RecentRow } from './TeamPage'

const POS_LABEL: Record<string, string> = { GK: 'Darvozabon', DF: 'Himoyachi', MF: 'Yarim himoyachi', FW: 'Hujumchi' }

/** O'yinchi sahifasi — fidda bor maydonlar: foto, pozitsiya, raqam, davlat, jamoa oxirgi o'yinlari.
 *  Bozor qiymati/shartnoma/reyting fidda yo'q — ko'rsatilmaydi. */
export default function PlayerPage({ id }: { id: string }) {
  const nav = useNav()
  const sep = id.indexOf(':')
  const gameId = sep > 0 ? id.slice(0, sep) : ''
  const playerHash = sep > 0 ? id.slice(sep + 1) : ''
  const { data, error, loading, reload } = useFetch(
    () => fetchPlayer(gameId, playerHash),
    [gameId, playerHash],
  )
  if (data) registerTeam(data.team)

  if (loading) return <div className="page detail"><PlayerSkeleton /></div>
  if (error || !data) {
    return (
      <div className="page detail">
        <div className="empty-note">O'yinchi ma'lumoti topilmadi</div>
        <ErrorBox onRetry={reload} />
      </div>
    )
  }

  const p = data.player
  const initials = p.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="page detail">
      <div className="player-hero">
        {p.photo
          ? <img className="avatar-img big" src={p.photo} alt={p.name} />
          : <span className="avatar big">{initials}</span>}
        <div>
          <h2>{p.name}</h2>
          <button className="player-team-link" onClick={() => nav.openTeam(data.team.id)}>
            <Crest teamId={data.team.id} size={18} /> {data.team.name}
          </button>
        </div>
        {p.rating !== undefined && <span className="player-last-rating"><RatingPill value={p.rating} big /></span>}
      </div>

      <div className="meta-card">
        {p.pos && <div className="meta-row"><span>Pozitsiya</span><b>{POS_LABEL[p.pos] ?? p.pos}{p.number ? ` · #${p.number}` : ''}</b></div>}
        {p.country && <div className="meta-row"><span>Davlat</span><b>{p.country}</b></div>}
        <div className="meta-row"><span>Jamoa</span><b>{data.team.name}</b></div>
      </div>

      <h3 className="block-title">Jamoaning oxirgi o'yinlari</h3>
      {data.teamRecent.length === 0
        ? <div className="empty-note">Oxirgi o'yinlar topilmadi</div>
        : data.teamRecent.map((g, i) => <RecentRow key={i} g={g} />)}
    </div>
  )
}
