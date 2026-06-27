/**
 * TrustLevelsCard — "La confianza es el producto": explains each verification
 * level next to the very badge users will see across the platform.
 */
import { VerificationBadge, type VerificationLevel } from '@/components/atoms/verification-badge';
import type { Messages } from '@/i18n/messages/es';

interface TrustLevelRow {
  level: VerificationLevel;
  text: string;
}

interface TrustLevelsCardProps {
  heading: string;
  intro: string;
  rows: TrustLevelRow[];
  tVerification: Messages['verification_badge'];
}

export function TrustLevelsCard({ heading, intro, rows, tVerification }: TrustLevelsCardProps) {
  return (
    <div className="rounded-card border border-line bg-white p-[18px]">
      <h3 className="font-display text-base font-bold text-navy">{heading}</h3>
      <p className="mt-1 text-[13px] leading-[1.45] text-muted">{intro}</p>
      <ul className="mt-3.5 flex flex-col gap-2.5">
        {rows.map((row) => (
          <li key={row.level} className="flex items-center gap-2.5">
            <VerificationBadge level={row.level} t={tVerification} />
            <span className="text-[12.5px] text-muted">{row.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
