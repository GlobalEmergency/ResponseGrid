interface PageHeadingProps {
  title: string;
  subtitle?: string;
}

export function PageHeading({ title, subtitle }: PageHeadingProps) {
  return (
    <div className="px-4 pt-6">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy">{title}</h1>
      {subtitle !== undefined && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
