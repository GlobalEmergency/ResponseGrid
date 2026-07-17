import {
  normalizeSupplyText,
  supplyResolverFromCatalog,
  allLocalizedVariants,
  localize,
  PublicSupplyRecord,
  SupplyCatalogReadModel,
} from '@globalemergency/warehouse-core/catalog';

export interface SupplyCatalogQuery {
  q?: string | undefined;
  categorySlug?: string | undefined;
  locale: string;
  limit: number;
  offset: number;
}

function levenshtein(a: string, b: string): number {
  const tmp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), // substitution
      );
    }
  }
  return tmp[a.length][b.length];
}

function getMatchScore(
  record: PublicSupplyRecord,
  query: string,
  exactMatchId: string | null,
): number {
  if (exactMatchId && record.id === exactMatchId) {
    return 100;
  }

  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return 0;

  const nameWords = allLocalizedVariants(
    record.name,
    record.translations,
  ).flatMap((variant) => variant.toLowerCase().split(/\s+/).filter(Boolean));
  const aliasWords = record.aliases.flatMap((a) =>
    a.toLowerCase().split(/\s+/).filter(Boolean),
  );

  let score = 0;

  for (const qWord of queryWords) {
    let bestWordScore = 0;

    const check = (tWord: string, weight: number) => {
      if (tWord === qWord) {
        bestWordScore = Math.max(bestWordScore, 10 * weight);
      } else if (tWord.startsWith(qWord)) {
        bestWordScore = Math.max(bestWordScore, 8 * weight);
      } else if (tWord.includes(qWord)) {
        bestWordScore = Math.max(bestWordScore, 5 * weight);
      } else if (qWord.length >= 3) {
        const dist = levenshtein(qWord, tWord);
        const maxAllowed = qWord.length > 5 ? 2 : 1;
        if (dist <= maxAllowed) {
          bestWordScore = Math.max(bestWordScore, (5 - dist) * weight);
        }
      }
    };

    for (const tWord of nameWords) check(tWord, 2);
    for (const tWord of aliasWords) check(tWord, 1.5);

    if (bestWordScore === 0) {
      // If a query word matches absolutely nothing, the whole query fails
      return 0;
    }
    score += bestWordScore;
  }

  return score;
}

/**
 * Colador tolerante a cualquier locale: un tag de idioma no válido (p. ej.
 * derivado de un `Accept-Language` raro) haría `RangeError`; caemos a `es`.
 */
function safeCollator(locale: string): Intl.Collator {
  try {
    return new Intl.Collator(locale, { sensitivity: 'base' });
  } catch {
    return new Intl.Collator('es', { sensitivity: 'base' });
  }
}

export class ListSupplies {
  constructor(private readonly catalog: SupplyCatalogReadModel) {}

  async execute(query: SupplyCatalogQuery): Promise<PublicSupplyRecord[]> {
    const records = await this.catalog.listActive();
    const locale = query.locale;
    const label = (record: PublicSupplyRecord): string =>
      localize(record.name, record.translations, locale);
    const normalizedQuery = query.q ? normalizeSupplyText(query.q) : '';
    const exactMatchId = query.q
      ? supplyResolverFromCatalog(records).resolve(query.q)
      : null;
    const collator = safeCollator(locale);

    if (!normalizedQuery) {
      const filtered = records.filter((record) => {
        return (
          !query.categorySlug || record.categorySlug === query.categorySlug
        );
      });
      const sorted = [...filtered].sort((a, b) =>
        collator.compare(label(a), label(b)),
      );
      return sorted.slice(query.offset, query.offset + query.limit);
    }

    const scored = records
      .map((record) => ({
        record,
        score: getMatchScore(record, normalizedQuery, exactMatchId),
      }))
      .filter(
        (item) =>
          item.score > 0 &&
          (!query.categorySlug ||
            item.record.categorySlug === query.categorySlug),
      );

    const sorted = scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return collator.compare(label(a.record), label(b.record));
    });

    return sorted
      .map((item) => item.record)
      .slice(query.offset, query.offset + query.limit);
  }
}
