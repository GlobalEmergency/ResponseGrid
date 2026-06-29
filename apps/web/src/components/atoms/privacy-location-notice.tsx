interface PrivacyLocationNoticeProps {
  text: string;
}

export function PrivacyLocationNotice({ text }: PrivacyLocationNoticeProps) {
  return (
    <p
      role="note"
      className="flex items-start gap-1.5 text-xs text-warning"
    >
      <span aria-hidden="true" className="flex-shrink-0 leading-none mt-0.5">
        📍
      </span>
      {text}
    </p>
  );
}
