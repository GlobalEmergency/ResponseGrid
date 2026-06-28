/**
 * TrustLevelsCard — "La confianza es el producto": explains each verification
 * level next to the very badge users will see across the platform.
 */
import { Card } from '@/components/atoms/card';
import { SectionHeading } from '@/components/atoms/section-heading';
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
    <Card className="p-[18px]">
      <SectionHeading as="h3" size="sm">{heading}</SectionHeading>
      <p className="mt-1 text-[13px] leading-[1.45] text-muted">{intro}</p>
      <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-3 sm:gap-4">
        {rows.map((row) => (
          <li key={row.level} className="flex items-center gap-2.5 sm:flex-col sm:items-start sm:gap-1.5">
            <VerificationBadge level={row.level} t={tVerification} />
            <span className="text-[12.5px] text-muted">{row.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
