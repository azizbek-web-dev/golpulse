// GolPulse logotipi — A variant: futbol to'pi doirasi + ichidan o'tgan
// puls (EKG) chizig'i. «Gol» + «Pulse» g'oyasi bitta belgida.
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="15.5" fill="#151A21" stroke="#EDF1F5" strokeWidth="2.6" />
      <path d="M24 19.4 L28.4 22.6 L26.7 27.9 L21.3 27.9 L19.6 22.6 Z" fill="#EDF1F5" />
      <path
        d="M24 19.4 L24 9.8 M28.4 22.6 L37.3 19.7 M26.7 27.9 L31.1 35.4 M21.3 27.9 L16.9 35.4 M19.6 22.6 L10.7 19.7"
        stroke="#EDF1F5"
        strokeWidth="1.5"
        opacity="0.7"
      />
      <polyline
        points="3,24 15,24 21,15 24.5,33 27,24 45,24"
        fill="none"
        stroke="#00D26A"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Fullscreen rejimda tepa markazda chiqadigan logotip.
 * Telegram tugmalari (chapda «Yopish», o'ngda ⋮) orasidagi bo'sh zonaga tushadi.
 * CSS: faqat html[data-tg-fs='1'] da ko'rinadi, balandligi --tg-inset-top,
 * pointer-events: none — hech narsani to'smaydi.
 */
export function FullscreenLogo() {
  return (
    <div className="fs-logo" aria-hidden="true">
      <LogoMark size={21} />
      <span className="fs-logo-text">
        Gol<span className="fs-logo-accent">Pulse</span>
      </span>
    </div>
  )
}
