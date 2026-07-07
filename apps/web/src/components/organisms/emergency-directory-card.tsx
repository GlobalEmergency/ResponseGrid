import Link from 'next/link';
import type { components } from '@responsegrid/api-client';
import { RelativeTime } from '@/components/atoms/relative-time';

type EmergencyViewDto = components['schemas']['EmergencyViewDto'];

interface EmergencyDirectoryCardProps {
  emergency: EmergencyViewDto;
  activeLabel: string;
  enterLabel: string;
}

export function EmergencyDirectoryCard({ emergency, activeLabel, enterLabel }: EmergencyDirectoryCardProps) {
  return (
    <Link
      href={`/e/${emergency.slug}`}
      className="block rounded-card border border-line bg-white p-4 transition-colors hover:border-navy/30 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
    >
      <article>
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success-dot" aria-hidden="true" />
            {activeLabel}
          </span>
          <span className="flex items-center gap-1 text-[11.5px] text-muted-soft">
            <span aria-hidden="true">🕑</span>
            <RelativeTime isoString={emergency.updatedAt} />
          </span>
        </div>
        <h3 className="text-base font-bold leading-tight text-navy">{emergency.name}</h3>
        <p className="mt-0.5 text-[12.5px] text-muted-soft">{emergency.country}</p>
        {emergency.announcement != null && emergency.announcement !== '' && (
          <p className="mt-2 line-clamp-3 text-[13.5px] leading-[1.45] text-ink-soft">
            {emergency.announcement}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-accent">
          {enterLabel} →
        </span>
      </article>
    </Link>
  );
}
