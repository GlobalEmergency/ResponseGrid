/**
 * Renders a JSON-LD structured-data block. Search engines and AI assistants
 * (ChatGPT, Perplexity, Gemini, Google AI Overviews) read this to understand
 * and cite the page. One `<script type="application/ld+json">` per call.
 *
 * The payload can embed DB-sourced strings (emergency name, announcement), so
 * we escape `<`, `>` and `&` to prevent a `</script>` breakout / JSON-LD
 * injection — the standard mitigation for inlined structured data.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
