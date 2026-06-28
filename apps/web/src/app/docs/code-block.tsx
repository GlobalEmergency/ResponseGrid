'use client';

/**
 * CodeBlock — presentational code/JSON/curl sample for the developer docs page
 * (/docs). Dark navy surface so samples stand out from the warm page, with an
 * optional language label and a copy-to-clipboard button.
 *
 * Client component (clipboard + local "copied" state). Per the project i18n
 * pattern, the translated button labels are passed in as plain-string props
 * from the Server Component that renders it — no dictionary is read here.
 */
import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  /** Short language tag shown in the header bar, e.g. "cURL", "JSON". */
  lang?: string;
  copyLabel: string;
  copiedLabel: string;
}

export function CodeBlock({ code, lang, copyLabel, copiedLabel }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. non-secure context) — fail silently.
    }
  }

  return (
    <div className="overflow-hidden rounded-card border border-navy/15 bg-navy text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">
          {lang ?? 'HTTP'}
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded-md px-2 py-1 text-[12px] font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 text-[12.5px] leading-[1.6]">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
