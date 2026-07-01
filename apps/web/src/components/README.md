# Component library — Atomic Design

UI lives in `src/components`, organised by Atomic Design so it stays
discoverable, consistent and replicable.

```
components/
├─ atoms/        smallest building blocks — no business logic
├─ molecules/    a few atoms composed into a small unit
├─ organisms/    larger, self-contained sections (often data-aware)
└─ providers/    React context providers
```

**Dependency rule:** a layer may import from the same or a *lower* layer only.
Atoms never import molecules/organisms; molecules never import organisms. Pages
(`src/app/**`) compose organisms/molecules/atoms.

## Brand tokens (Tailwind v4)

Defined once in `src/app/globals.css` (`@theme`) and consumed as utilities —
**never hard-code hex**. Use the token utilities:

| Purpose            | Tokens (utility suffix)                                  |
| ------------------ | -------------------------------------------------------- |
| Brand              | `navy`, `navy-700`, `accent`, `accent-600`              |
| Surfaces / ink     | `surface`, `surface-alt`, `ink`, `ink-soft`, `muted`, `muted-soft` |
| Lines              | `line`, `line-soft`, `line-strong`                       |
| Status             | `success(/-soft/-dot)`, `warning(/-soft/-dot)`, `danger(/-soft/-tint/-strong/-line)` |
| Tags / family      | `official-soft`, `family-soft/-line/-ink`               |
| On navy band       | `on-navy`, `on-navy-soft`                                |
| Type / radius      | `font-display` (Archivo), `font-sans` (Public Sans), `rounded-card` |

e.g. `bg-navy text-white`, `border-line`, `text-on-navy`, `rounded-card`.

## Reusable primitives (prefer these over re-inlining)

- **`Card`** (atom) — the warm surface card (`rounded-card border border-line bg-white`); add padding/layout via `className`, pick the element via `as`.
- **`SectionHeading`** (atom) — Archivo/navy/bold section titles (`size` sm/md/lg, `as` h2/h3).
- **`Badge`** + `PriorityBadge` / `VerificationBadge` / `StatusLight` (atoms) — all pill/status chips. Add a `Badge` variant rather than inlining a new pill.
- **`Button`**, `Input`, `Select`, `Textarea`, `Label` (atoms) — form controls.
- **`AppBar`** (organism) — the unified sticky public nav bar (brand · context · CTAs · language · account). Renders on every public page via `variant: 'home' | 'emergency' | 'action' | 'content'`. Do NOT use inside `/panel` or `/coordinacion` (they own their sidebar chrome).
- **`HeaderBandShell`** (molecule) — the navy "Banda oficial" header chrome; base for `PageHeaderBand` (kept for client-only pages: offline, auth/complete).
- **`PageHeaderBand`** (molecule) — drop-in branded header (back + title/subtitle) for client-only inner pages that can't mount the async `AppBar`; pair with a `bg-surface` page wrapper.
- **`FormField`**, `EmptyState`, `FormSuccessScreen` (molecules) — form/list scaffolding.

## Adding a component

1. Pick the right layer (atoms → molecules → organisms).
2. Reuse tokens + existing primitives; don't re-inline `rounded-card …` or hex.
3. Keep i18n strings in props (`t` slices), not hard-coded, for user-facing copy.
4. Default to a Server Component; add `'use client'` only when you need state/effects.
