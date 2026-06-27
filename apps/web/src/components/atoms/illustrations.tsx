/**
 * Brand illustrations — self-authored, decorative inline SVGs for the static
 * content pages. Vector (crisp at any size), themed with the design-system
 * palette, and lightweight (no external assets). Marked aria-hidden: the page
 * copy carries the meaning. Each accepts a className for sizing.
 *
 * Palette: navy #112b4a · navy-700 #13315c · accent #e8740e · surface-alt
 * #f4f1ec · line #e7e2da.
 */
interface IllustrationProps {
  className?: string;
}

const SHARED = {
  role: 'img' as const,
  'aria-hidden': true,
  xmlns: 'http://www.w3.org/2000/svg',
};

/** Coordination network — a map with connected response points (About). */
export function CoordinationIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 400 240" fill="none" className={className} {...SHARED}>
      <rect width="400" height="240" rx="20" fill="#f4f1ec" />
      <g stroke="#e7e2da" strokeWidth="2">
        <path d="M0 70h400M0 140h400M120 0v240M270 0v240" />
      </g>
      {/* connection lines */}
      <g stroke="#13315c" strokeWidth="2.5" strokeDasharray="3 7" strokeLinecap="round" opacity="0.5">
        <path d="M200 130 96 70" />
        <path d="M200 130 300 78" />
        <path d="M200 130 132 178" />
        <path d="M200 130 286 168" />
      </g>
      {/* central hub */}
      <circle cx="200" cy="130" r="30" fill="#112b4a" />
      <path d="M200 116 215 142 185 142 Z" fill="#e8740e" />
      {/* pins */}
      {[
        [96, 70],
        [300, 78],
        [132, 178],
        [286, 168],
      ].map(([x, y], i) => (
        <g key={i}>
          <path
            d={`M${x} ${y - 18}c-9 0-16 7-16 16 0 11 16 24 16 24s16-13 16-24c0-9-7-16-16-16Z`}
            fill={i % 2 === 0 ? '#e8740e' : '#13315c'}
          />
          <circle cx={x} cy={y - 2} r="6" fill="#fbfaf8" />
        </g>
      ))}
    </svg>
  );
}

/** Three connected steps (How it works). */
export function StepsIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 400 200" fill="none" className={className} {...SHARED}>
      <rect width="400" height="200" rx="20" fill="#f4f1ec" />
      <path d="M70 100h260" stroke="#cfc8bc" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
      {[
        { x: 70, fill: '#112b4a', n: '1' },
        { x: 200, fill: '#112b4a', n: '2' },
        { x: 330, fill: '#e8740e', n: '3' },
      ].map((s) => (
        <g key={s.n}>
          <circle cx={s.x} cy="100" r="34" fill="#fbfaf8" />
          <circle cx={s.x} cy="100" r="30" fill={s.fill} />
          <text
            x={s.x}
            y="111"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontSize="30"
            fontWeight="800"
            fill="#fbfaf8"
          >
            {s.n}
          </text>
        </g>
      ))}
      <path d="M150 100l14-8v16zM280 100l14-8v16z" fill="#e8740e" />
    </svg>
  );
}

/** Shield + check — verification & data protection (Transparency). */
export function ShieldIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 400 240" fill="none" className={className} {...SHARED}>
      <rect width="400" height="240" rx="20" fill="#f4f1ec" />
      <path
        d="M200 36 296 70v60c0 54-40 86-96 110-56-24-96-56-96-110V70l96-34Z"
        fill="#112b4a"
      />
      <path
        d="M200 52 280 80v50c0 44-32 72-80 92-48-20-80-48-80-92V80l80-28Z"
        fill="#13315c"
        stroke="#e8740e"
        strokeWidth="2.5"
      />
      <path
        d="M168 132l22 22 44-46"
        stroke="#fbfaf8"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* open-source nodes */}
      <g fill="#e8740e">
        <circle cx="120" cy="64" r="5" />
        <circle cx="286" cy="64" r="5" />
        <circle cx="200" cy="214" r="5" />
      </g>
    </svg>
  );
}

/** Badge / rosette with check + trust rows (Verify a campaign). */
export function VerifyIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 400 240" fill="none" className={className} {...SHARED}>
      <rect width="400" height="240" rx="20" fill="#f4f1ec" />
      {/* trust rows card */}
      <rect x="40" y="56" width="180" height="128" rx="14" fill="#fbfaf8" stroke="#e7e2da" strokeWidth="2" />
      {[
        { y: 84, c: '#8a93a2' },
        { y: 120, c: '#1e8049' },
        { y: 156, c: '#112b4a' },
      ].map((r) => (
        <g key={r.y}>
          <circle cx="66" cy={r.y} r="9" fill={r.c} />
          <rect x="86" y={r.y - 6} width="108" height="12" rx="6" fill="#eae5dd" />
        </g>
      ))}
      {/* rosette badge */}
      <g>
        <circle cx="300" cy="116" r="58" fill="#e8740e" />
        <circle cx="300" cy="116" r="46" fill="#fbfaf8" />
        <path
          d="M278 116l16 16 30-32"
          stroke="#e8740e"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M280 168l-12 36 32-16 32 16-12-36Z" fill="#c85f08" />
      </g>
    </svg>
  );
}
