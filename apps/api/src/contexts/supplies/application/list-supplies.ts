import { normalizeSupplyText } from '../domain/supply-normalize';
import { supplyResolverFromCatalog } from '../domain/supply-resolver';
import {
  PublicSupplyRecord,
  SupplyCatalogReadModel,
} from '../domain/ports/supply-catalog.read-model';

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

  const nameEsWords = record.nameEs.toLowerCase().split(/\s+/).filter(Boolean);
  const nameEnWords = (record.nameEn ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
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

    for (const tWord of nameEsWords) check(tWord, 2);
    for (const tWord of nameEnWords) check(tWord, 2);
    for (const tWord of aliasWords) check(tWord, 1.5);

    if (bestWordScore === 0) {
      // If a query word matches absolutely nothing, the whole query fails
      return 0;
    }
    score += bestWordScore;
  }

  return score;
}

export class ListSupplies {
  constructor(private readonly catalog: SupplyCatalogReadModel) {}

  async execute(query: SupplyCatalogQuery): Promise<PublicSupplyRecord[]> {
    const records = await this.catalog.listActive();
    const resolvedLocale = query.locale === 'en' ? 'en' : 'es';
    const normalizedQuery = query.q ? normalizeSupplyText(query.q) : '';
    const exactMatchId = query.q
      ? supplyResolverFromCatalog(records).resolve(query.q)
      : null;

    if (!normalizedQuery) {
      const filtered = records.filter((record) => {
        return (
          !query.categorySlug || record.categorySlug === query.categorySlug
        );
      });
      const collator = new Intl.Collator(resolvedLocale, {
        sensitivity: 'base',
      });
      const sorted = [...filtered].sort((a, b) => {
        const aLabel =
          resolvedLocale === 'en' && a.nameEn ? a.nameEn : a.nameEs;
        const bLabel =
          resolvedLocale === 'en' && b.nameEn ? b.nameEn : b.nameEs;
        return collator.compare(aLabel, bLabel);
      });
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

    const collator = new Intl.Collator(resolvedLocale, { sensitivity: 'base' });
    const sorted = scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const aLabel =
        resolvedLocale === 'en' && a.record.nameEn
          ? a.record.nameEn
          : a.record.nameEs;
      const bLabel =
        resolvedLocale === 'en' && b.record.nameEn
          ? b.record.nameEn
          : b.record.nameEs;
      return collator.compare(aLabel, bLabel);
    });

    return sorted
      .map((item) => item.record)
      .slice(query.offset, query.offset + query.limit);
  }
}
