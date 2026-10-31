// GolPulse — inline SVG ikonkalar (Lucide uslubi: 24x24, stroke 2, round caps).
// Emoji ikonlar o'rniga ishlatiladi: navigatsiya, voqealar, interfeys belgilari.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

/** Jonli — puls chizig'i (GolPulse brendi) */
export const IconActivity = (p: IconProps) => (
  <Svg {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Svg>
)

/** Futbol to'pi */
export const IconBall = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 7.2 15.1 9.5 13.9 13.1 10.1 13.1 8.9 9.5Z" fill="currentColor" stroke="none" />
    <path d="M12 2.2v5M20.6 8.4l-5.5 1.1M16.9 19.3l-3-6.2M7.1 19.3l3-6.2M3.4 8.4l5.5 1.1" />
  </Svg>
)

/** Kubok — Ligalar tabi */
export const IconTrophy = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </Svg>
)

/** Yulduz — Sevimlilar (filled=true bo'lsa ichi to'la) */
export const IconStar = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Svg>
)

/** Qidiruv lupasi */
export const IconSearch = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Svg>
)

/** Pin (qistirgich) — ligani mahkamlash */
export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4h6v5.5L18 14H6l3-4.5Z" />
    <path d="M12 14v7" />
  </Svg>
)

/** Jadval (grid) ikonkasi */
export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </Svg>
)

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>
)
export const IconChevronUp = (p: IconProps) => (
  <Svg {...p}><path d="m18 15-6-6-6 6" /></Svg>
)
export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}><path d="m15 18-6-6 6-6" /></Svg>
)
export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>
)

/** Kalendar */
export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 2v4" /><path d="M16 2v4" />
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M3 10h18" />
  </Svg>
)

/** Yopish (X) */
export const IconX = (p: IconProps) => (
  <Svg {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>
)

/** Karta — sariq/qizil to'rtburchak (fill rang prop orqali) */
export const IconCard = ({ color = '#FFC531', size = 24, ...p }: IconProps & { color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <rect x="6.5" y="3" width="11" height="18" rx="2" fill={color} />
  </svg>
)

/** Almashtirish — yuqoriga/pastga strelkalar */
export const IconSub = (p: IconProps) => (
  <Svg {...p}>
    <path d="m17 3 4 4-4 4" /><path d="M21 7H9" />
    <path d="m7 21-4-4 4-4" /><path d="M3 17h12" />
  </Svg>
)

/** Vaziyat/nishon — target */
export const IconTarget = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </Svg>
)

/** Qo'ng'iroqcha — o'yin kuzatuvi (filled=true bo'lsa ichi to'la, faol holat) */
export const IconBell = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Svg>
)

/** Joylashuv — stadion/meta */
export const IconMapPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Svg>
)

/** Sig'im — tomoshabinlar */
export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
)

/** Hakam — foydalanuvchi belgisi */
export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
)

/** Bosqich/tur — bayroq */
export const IconFlag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" x2="4" y1="22" y2="15" />
  </Svg>
)

/** Harorat — termometr */
export const IconThermometer = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
  </Svg>
)

/** Ob-havo — bulut */
export const IconCloud = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </Svg>
)
