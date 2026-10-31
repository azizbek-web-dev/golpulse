// GolPulse logotipi — 3-variant «Signal / jonli efir» (foydalanuvchi tanlovi,
// 2026-10-31): gradient neon yashil to'p + undan taralayotgan efir halqalari.
// Yozuv: «Gol» oq + «Pulse» gradient yashil (styles.css — .fs-logo-accent).
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="gpMarkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00FF88" />
          <stop offset="1" stopColor="#00C853" />
        </linearGradient>
        <radialGradient id="gpMarkBall" cx="0.38" cy="0.35" r="0.9">
          <stop offset="0" stopColor="#2BFF95" />
          <stop offset="1" stopColor="#00C95E" />
        </radialGradient>
        <filter id="gpMarkGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>
      <g transform="translate(2.4 0)">
        {/* Signal halqalari */}
        <g fill="none" stroke="url(#gpMarkGrad)" strokeLinecap="round">
          <path d="M 38 14.8 A 21 21 0 0 1 38 49.2" strokeWidth="4.5" opacity="0.95" />
          <path d="M 41.5 9.9 A 27 27 0 0 1 41.5 54.1" strokeWidth="4" opacity="0.5" />
          <path d="M 44.9 5 A 33 33 0 0 1 44.9 59" strokeWidth="3.5" opacity="0.25" />
        </g>
        {/* Yorqin to'p */}
        <circle cx="26" cy="32" r="13.5" fill="url(#gpMarkBall)" filter="url(#gpMarkGlow)" opacity="0.55" />
        <circle cx="26" cy="32" r="13.5" fill="url(#gpMarkBall)" />
        <g stroke="#0E1116" strokeWidth="1.3" opacity="0.45">
          <line x1="26" y1="26.4" x2="26" y2="18.5" />
          <line x1="31.3" y1="30.3" x2="38.8" y2="27.8" />
          <line x1="29.3" y1="36.5" x2="33.9" y2="42.9" />
          <line x1="22.7" y1="36.5" x2="18.1" y2="42.9" />
          <line x1="20.7" y1="30.3" x2="13.2" y2="27.8" />
        </g>
        <polygon points="26,26.4 31.3,30.3 29.3,36.5 22.7,36.5 20.7,30.3" fill="#0E1116" />
      </g>
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
